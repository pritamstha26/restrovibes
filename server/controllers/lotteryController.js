import { Op } from "sequelize";
import sequelize from "../config/db.js";
import { LotteryPoolModel, BookingHistoryModel, UsersModel } from "../models/model.js";
import AppointmentModel from "../models/appointmentModel.js";
import { ScoringEngine } from "../utils/scoring.js";
import { getWeightedEntries, selectWeightedEntry, getEffectiveWeight } from "../utils/weightedLottery.js";
import { getLotteryResolutionTime, isLotteryClosed, slotStartTime, LOTTERY_CUTOFF_MINUTES, MIN_GAP_MINUTES, getLotteryCountdown } from "../utils/lotteryTime.js";

const BOOKING_BUFFER_MINUTES = Number(process.env.BOOKING_BUFFER_MINUTES) || 15;
const MIN_GAP_MS = (Number(process.env.MIN_GAP_MINUTES) || 60) * 60 * 1000;

// Find an accepted/in-progress booking whose effective window (service duration +
// buffer) overlaps [windowStart, windowStart + duration + buffer). This is what
// makes adjacent slots (e.g. 09:45 vs 10:00) compete for the same resource.
async function findOccupant(restaurantId, windowStart, durationMinutes, excludeClientIds = []) {
  const start = new Date(windowStart);
  const end = new Date(
    start.getTime() +
      ((Number(durationMinutes) || 45) + BOOKING_BUFFER_MINUTES) * 60 * 1000,
  );

  const where = {
    restaurateurId: restaurantId,
    status: { [Op.in]: ["accepted", "in_progress"] },
    [Op.and]: [
      { date: { [Op.lt]: end } },
      {
        [Op.or]: [
          { end_time: { [Op.gt]: start } },
          { end_time: null, date: { [Op.gt]: start } },
        ],
      },
    ],
  };

  if (excludeClientIds.length) {
    where.clientId = { [Op.notIn]: excludeClientIds };
  }

  return AppointmentModel.findOne({ where, order: [["date", "ASC"]] });
}

export const enterLottery = async (req, res) => {
  try {
    const {
      restaurantId,
      bookingDate,
      preferredTimeSlot,
      partySize,
      preferences = {},
    } = req.body;

    const userId = req.user.id;

    if (
      typeof restaurantId !== "number" ||
      typeof bookingDate !== "string" ||
      typeof preferredTimeSlot !== "number" ||
      typeof partySize !== "number"
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (preferredTimeSlot < 0 || preferredTimeSlot > 95) {
      return res.status(400).json({ message: "Time slot must be between 0 and 95" });
    }

    const countdown = getLotteryCountdown(bookingDate, preferredTimeSlot);

    const resolutionTime = getLotteryResolutionTime(bookingDate, preferredTimeSlot);
    if (isLotteryClosed(bookingDate, preferredTimeSlot)) {
      return res.status(409).json({
        message: "This slot's lottery has closed. Choose another time or review alternatives.",
        resolutionTime,
        countdown,
      });
    }

    const existingCount = await LotteryPoolModel.count({
      where: {
        restaurant_id: restaurantId,
        booking_date: bookingDate,
        preferred_time_slot: preferredTimeSlot,
        status: "pending",
      },
    });

    if (existingCount === 0) {
      return res.status(200).json({
        status: "available",
        message: "Slot available for immediate booking",
        requiresLottery: false,
      });
    }

    const weight = await ScoringEngine.calculateTotalWeight(
      userId,
      restaurantId,
      preferences,
    );

    const entry = await LotteryPoolModel.create({
      restaurant_id: restaurantId,
      user_id: userId,
      booking_date: bookingDate,
      preferred_time_slot: preferredTimeSlot,
      party_size: partySize,
      flexibility_range_minutes: preferences.flexibilityRangeMinutes || 0,
      weight,
      status: "pending",
      alternative_accepted: false,
    });

    const flexibilityScore = ScoringEngine.calculateFlexibility(preferences);
    await UsersModel.update(
      { flexibility_score: flexibilityScore },
      { where: { id: userId } },
    );

    const competitorCount = existingCount;

    return res.status(200).json({
      status: "entered_lottery",
      requiresLottery: true,
      lotteryEntry: {
        id: entry.id,
        weight,
        totalCompetitors: competitorCount,
        estimatedChance: calculateEstimatedChance(weight, competitorCount),
        resolutionTime,
        countdown,
      },
    });
  } catch (error) {
    console.error("Error in enterLottery:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getLotteryStatus = async (req, res) => {
  try {
    const userId = req.user.id;

    const entries = await LotteryPoolModel.findAll({
      where: {
        user_id: userId,
        status: {
          [Op.in]: ["pending", "won"],
        },
      },
      attributes: [
        "id",
        "restaurant_id",
        "booking_date",
        "preferred_time_slot",
        "party_size",
        "weight",
        "status",
        "entered_at",
      ],
      order: [["entered_at", "DESC"]],
    });

    const enriched = entries.map((entry) => ({
      ...entry.toJSON(),
      resolutionTime: getLotteryResolutionTime(
        entry.booking_date,
        entry.preferred_time_slot,
      ),
    }));

    return res.status(200).json({ entries: enriched });
  } catch (error) {
    console.error("Error in getLotteryStatus:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getAlternatives = async (req, res) => {
  try {
    const { restaurantId, bookingDate, preferredTimeSlot, partySize } = req.body;

    if (
      typeof restaurantId !== "number" ||
      typeof bookingDate !== "string" ||
      typeof preferredTimeSlot !== "number" ||
      typeof partySize !== "number"
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const slotOffsets = [-4, -2, 2, 4];
    const alternatives = [];

    for (const offset of slotOffsets) {
      const slot = preferredTimeSlot + offset;
      if (slot < 0 || slot > 95) continue;

      const count = await LotteryPoolModel.count({
        where: {
          restaurant_id: restaurantId,
          booking_date: bookingDate,
          preferred_time_slot: slot,
          status: "pending",
        },
      });

      alternatives.push({
        timeSlot: slot,
        competitorCount: count,
        requiresLottery: count > 0,
        available: count === 0,
      });
    }

    const clearanceProbability = await ScoringEngine.predictCancellation(
      restaurantId,
      bookingDate,
      preferredTimeSlot,
    );

    const waitlist = {
      clearanceProbability,
      message:
        clearanceProbability > 0.5
          ? "Good chance of cancellation — consider waiting."
          : "Low chance of cancellation — expect to use lottery.",
    };

    return res.status(200).json({
      preferredSlot: preferredTimeSlot,
      alternatives,
      waitlist,
    });
  } catch (error) {
    console.error("Error in getAlternatives:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Resolve the contest for one resource window. Pending entries from *overlapping*
// slots are treated as a single contest so the per-slot draw order can't favour an
// earlier time. First-come priority still comes from the aging weight in
// getWeightedEntries. `force` lets admin/demo bypass the wait-for-deadline guard.
export const resolveLottery = async (
  restaurantId,
  bookingDate,
  timeSlot,
  { force = false, now = new Date() } = {},
) => {
  try {
    // Dynamic "as-of" time: lets callers (admin resolve, demo scripts) draw the
    // lottery as if it were any moment instead of waiting for the real clock.
    // Defaults to real now, so the scheduler path is unchanged.
    const nowMs = new Date(now).getTime();
    if (Number.isNaN(nowMs)) {
      throw new Error("Invalid `now` datetime passed to resolveLottery");
    }
    const seedEntries = await LotteryPoolModel.findAll({
      where: {
        restaurant_id: restaurantId,
        booking_date: bookingDate,
        preferred_time_slot: timeSlot,
        status: "pending",
      },
      order: [["weight", "DESC"]],
    });

    if (!seedEntries.length) {
      return null;
    }

    const dayStart = new Date(bookingDate + "T00:00:00");
    const dayEnd = new Date(bookingDate + "T23:59:59.999");

    // Every entry still pending for the day, so overlaps can be grouped.
    const allEntries = await LotteryPoolModel.findAll({
      where: {
        restaurant_id: restaurantId,
        booking_date: bookingDate,
        status: "pending",
      },
      order: [["entered_at", "ASC"]],
    });

    const userIds = [...new Set(allEntries.map((e) => e.user_id))];
    const appointments = userIds.length
      ? await AppointmentModel.findAll({
          where: {
            restaurateurId: restaurantId,
            clientId: { [Op.in]: userIds },
            date: { [Op.between]: [dayStart, dayEnd] },
            status: "pending",
          },
          order: [["date", "ASC"]],
        })
      : [];

    const apptByUser = new Map();
    for (const appt of appointments) {
      apptByUser.set(appt.clientId, appt);
    }

    // An entry occupies [requested start, start + service duration + buffer).
    const windowFor = (entry) => {
      const appt = apptByUser.get(entry.user_id);
      const start = appt
        ? new Date(appt.date)
        : slotStartTime(bookingDate, entry.preferred_time_slot);
      const duration = appt ? Number(appt.original_duration) || 45 : 45;
      const end = new Date(
        start.getTime() + (duration + BOOKING_BUFFER_MINUTES) * 60 * 1000,
      );
      return { start, end, duration };
    };

    const overlaps = (a, b) =>
      a.start.getTime() < b.end.getTime() &&
      b.start.getTime() < a.end.getTime();

    const seedWindows = seedEntries.map(windowFor);
    const seedWindow = {
      start: new Date(Math.min(...seedWindows.map((w) => w.start.getTime()))),
      end: new Date(Math.max(...seedWindows.map((w) => w.end.getTime()))),
    };

    const overlapping = allEntries.filter((entry) =>
      overlaps(windowFor(entry), seedWindow),
    );
    const group = overlapping.length ? overlapping : seedEntries;

    // Wait until every slot in the group has closed so late entrants can still
    // join. A larger cutoff no longer changes the out-come, only the wait.
    if (!force) {
      const latestDeadline = Math.max(
        ...group.map((entry) =>
          getLotteryResolutionTime(
            bookingDate,
            entry.preferred_time_slot,
          ).getTime(),
        ),
      );
      if (nowMs < latestDeadline) {
        return null;
      }
    }

    const entrantIds = [...new Set(group.map((e) => e.user_id))];

    // Only an entry whose own window is free can win; one blocked by an accepted
    // booking is effectively a waitlist and loses unless that booking cancels.
    const eligible = [];
    for (const entry of group) {
      const window = windowFor(entry);
      const occupant = await findOccupant(
        restaurantId,
        window.start,
        window.duration,
        entrantIds,
      );
      if (!occupant) {
        eligible.push({ entry, window });
      }
    }

    const groupIds = group.map((e) => e.id);
    const cancelAppointments = async (entriesToCancel) => {
      for (const entry of entriesToCancel) {
        const appt = apptByUser.get(entry.user_id);
        if (appt) {
          await AppointmentModel.update(
            { status: "cancelled" },
            { where: { id: appt.id } },
          );
        }
      }
    };
    const groupedSlots = [...new Set(group.map((e) => e.preferred_time_slot))].sort(
      (a, b) => a - b,
    );

    if (!eligible.length) {
      await LotteryPoolModel.update(
        { status: "lost" },
        { where: { id: groupIds } },
      );
      await cancelAppointments(group);

      return {
        winner: null,
        totalEntries: group.length,
        competitorCount: group.length,
        loserCancelled: true,
        reason: "slot_occupied",
        groupedSlots,
        message:
          "The slot is still occupied by an overlapping booking — lottery entrants were released.",
      };
    }

    const contestants = eligible.map((item) => item.entry);
    const weightedEntries = getWeightedEntries(contestants, nowMs);

    let winner;
    let winnerWeight;
    if (contestants.length === 1) {
      winner = contestants[0];
      winnerWeight = getEffectiveWeight(
        winner.weight,
        winner.entered_at,
        nowMs,
      );
    } else {
      const selected = selectWeightedEntry(contestants, Math.random(), undefined, nowMs);
      winner = selected.entry;
      winnerWeight = selected.effectiveWeight;
    }

    await LotteryPoolModel.update({ status: "won" }, { where: { id: winner.id } });

    const loserIds = group
      .filter((entry) => entry.id !== winner.id)
      .map((entry) => entry.id);

    if (loserIds.length) {
      await LotteryPoolModel.update(
        { status: "lost" },
        { where: { id: loserIds } },
      );
    }

    const winnerAppointment = apptByUser.get(winner.user_id);
    if (winnerAppointment) {
      await AppointmentModel.update(
        { status: "accepted" },
        { where: { id: winnerAppointment.id } },
      );
    }

    await cancelAppointments(group.filter((entry) => entry.id !== winner.id));

    // Harden: losers must not keep ANY booking overlapping the winner's awarded
    // window. cancelAppointments above only covers pending appointments tracked
    // in apptByUser, so a loser's pre-existing accepted booking would otherwise
    // survive and double-book the slot alongside the winner.
    const winnerWindow = windowFor(winner);
    const loserUserIds = [
      ...new Set(group.filter((e) => e.id !== winner.id).map((e) => e.user_id)),
    ];
    let releasedOverlapping = 0;
    if (loserUserIds.length) {
      const dayStart = new Date(bookingDate + "T00:00:00");
      const dayEnd = new Date(bookingDate + "T23:59:59.999");
      const loserAppts = await AppointmentModel.findAll({
        where: {
          restaurateurId: restaurantId,
          clientId: { [Op.in]: loserUserIds },
          date: { [Op.between]: [dayStart, dayEnd] },
          status: { [Op.in]: ["pending", "accepted", "in_progress"] },
        },
      });
      for (const a of loserAppts) {
        const aStart = new Date(a.date);
        const aEnd = a.end_time
          ? new Date(a.end_time)
          : new Date(
              aStart.getTime() +
                ((Number(a.original_duration) || 45) + BOOKING_BUFFER_MINUTES) *
                  60 *
                  1000,
            );
        if (
          a.id !== winnerAppointment?.id &&
          overlaps({ start: aStart, end: aEnd }, winnerWindow)
        ) {
          await AppointmentModel.update(
            { status: "cancelled" },
            { where: { id: a.id } },
          );
          releasedOverlapping += 1;
        }
      }
    }

    const totalEntries = group.length;
    const competitorCount = totalEntries - 1;
    const totalWeight = weightedEntries.reduce(
      (sum, item) => sum + item.effectiveWeight,
      0,
    );
    const winnerChance =
      contestants.length === 1
        ? "100.0%"
        : calculateWeightedChance(winnerWeight, totalWeight);

    const groupUserIds = [...new Set(group.map((e) => e.user_id))];
    const groupUsers = await UsersModel.findAll({
      where: { id: { [Op.in]: groupUserIds } },
      attributes: ["id", "first_name", "last_name"],
    });
    const groupNameOf = (id) => {
      const u = groupUsers.find((r) => r.id === id);
      return u ? `${u.first_name} ${u.last_name}`.trim() : `User #${id}`;
    };

    return {
      winner: {
        userId: winner.user_id,
        userName: groupNameOf(winner.user_id),
        weight: winnerWeight,
        entryId: winner.id,
        appointmentId: winnerAppointment ? winnerAppointment.id : null,
      },
      totalEntries,
      winnerChance,
      competitorCount,
      groupedSlots,
      releasedOverlapping,
      losers: group
        .filter((entry) => entry.id !== winner.id)
        .map((entry) => ({
          userId: entry.user_id,
          userName: groupNameOf(entry.user_id),
          weight:
            weightedEntries.find((item) => item.entry.id === entry.id)
              ?.effectiveWeight ??
            getEffectiveWeight(entry.weight, entry.entered_at, nowMs),
          entryId: entry.id,
        })),
    };
  } catch (error) {
    console.error("Error in resolveLottery:", error);
    throw error;
  }
};

export const manualResolve = async (req, res) => {
  try {
    const { restaurantId, bookingDate, timeSlot, resolveAt } = req.body;

    if (
      typeof restaurantId !== "number" ||
      typeof bookingDate !== "string" ||
      typeof timeSlot !== "number"
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Restaurants may only resolve their own venue's draws.
    if (req.user?.role === "restaurateurs" && Number(restaurantId) !== Number(req.user.id)) {
      return res.status(403).json({ message: "You can only resolve your own venue's lotteries" });
    }

    // Optional dynamic draw time: resolve "as of" any ISO datetime instead of
    // waiting for the real clock (e.g. simulate the draw 5h from now to grow
    // aging boosts). Defaults to right now.
    let now = new Date();
    if (resolveAt !== undefined) {
      now = new Date(resolveAt);
      if (Number.isNaN(now.getTime())) {
        return res.status(400).json({ message: "Invalid resolveAt datetime" });
      }
    }

    const result = await resolveLottery(restaurantId, bookingDate, timeSlot, {
      force: true,
      now,
    });

    if (!result) {
      return res.status(200).json({ message: "No pending entries found" });
    }

    return res.status(200).json({ ...result, resolvedAt: now.toISOString() });
  } catch (error) {
    console.error("Error in manualResolve:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Admin/demo helper: list every slot that currently has pending lottery entries.
export const getPendingPools = async (req, res) => {
  try {
    // Role scoping: admins see every pool, restaurants see their own venue,
    // clients see only contests they entered.
    const role = req.user?.role;
    const me = Number(req.user?.id);
    let poolQuery = `
      SELECT
        restaurant_id,
        to_char(booking_date, 'YYYY-MM-DD') AS booking_date,
        preferred_time_slot,
        COUNT(*)::int AS competitors
      FROM lottery_pool
      WHERE status = 'pending'
      GROUP BY restaurant_id, booking_date, preferred_time_slot
      ORDER BY booking_date ASC, preferred_time_slot ASC
      `;
    let replacements = {};
    if (role === "restaurateurs") {
      poolQuery = `
      SELECT
        restaurant_id,
        to_char(booking_date, 'YYYY-MM-DD') AS booking_date,
        preferred_time_slot,
        COUNT(*)::int AS competitors
      FROM lottery_pool
      WHERE status = 'pending' AND restaurant_id = :mine
      GROUP BY restaurant_id, booking_date, preferred_time_slot
      ORDER BY booking_date ASC, preferred_time_slot ASC
      `;
      replacements = { mine: me };
    } else if (role === "client") {
      poolQuery = `
      SELECT
        restaurant_id,
        to_char(booking_date, 'YYYY-MM-DD') AS booking_date,
        preferred_time_slot,
        COUNT(*)::int AS competitors
      FROM lottery_pool
      WHERE status = 'pending'
        AND (restaurant_id, booking_date, preferred_time_slot) IN (
          SELECT restaurant_id, booking_date, preferred_time_slot
          FROM lottery_pool
          WHERE user_id = :mine AND status = 'pending'
        )
      GROUP BY restaurant_id, booking_date, preferred_time_slot
      ORDER BY booking_date ASC, preferred_time_slot ASC
      `;
      replacements = { mine: me };
    }
    const pools = await sequelize.query(poolQuery, {
      type: sequelize.QueryTypes.SELECT,
      replacements,
    });

    const enriched = pools.map((pool) => {
      const resolutionTime = getLotteryResolutionTime(pool.booking_date, pool.preferred_time_slot);
      const countdown = getLotteryCountdown(pool.booking_date, pool.preferred_time_slot);
      return {
        restaurantId: pool.restaurant_id,
        bookingDate: pool.booking_date,
        timeSlot: pool.preferred_time_slot,
        competitors: pool.competitors,
        resolutionTime: resolutionTime.toISOString(),
        closed: isLotteryClosed(pool.booking_date, pool.preferred_time_slot),
        countdown,
      };
    });

    const appointmentWhere = {
      status: { [Op.in]: ["pending", "accepted"] },
      date: {
        [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0)),
        [Op.lte]: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
    };
    if (role === "restaurateurs") appointmentWhere.restaurateurId = me;
    if (role === "client") appointmentWhere.clientId = me;
    const pendingAppointmentRows = await AppointmentModel.findAll({
      where: appointmentWhere,
      attributes: ["id", "restaurateurId", "clientId", "date", "status"],
      order: [["date", "ASC"]],
      limit: 100,
    });

    const getTimeSlot = (date) => {
      const d = new Date(date);
      return d.getHours() * 4 + Math.floor(d.getMinutes() / 15);
    };

    const pendingAppointments = pendingAppointmentRows.map((a) => {
      const d = new Date(a.date);
      return {
        id: a.id,
        restaurantId: a.restaurateurId,
        clientId: a.clientId,
        date: d.toISOString(),
        bookingDate: d.toISOString().slice(0, 10),
        timeSlot: getTimeSlot(d),
        status: a.status,
      };
    });

    // Per-pool eligibility preview (same rule as resolveLottery): an entry can
    // only win if its window is NOT blocked by an accepted/in_progress booking
    // from someone outside the lottery. Exposed so the UI can warn before a
    // resolve that would end with no winner.
    for (const pool of enriched) {
      const entries = await LotteryPoolModel.findAll({
        where: {
          restaurant_id: pool.restaurantId,
          booking_date: pool.bookingDate,
          preferred_time_slot: pool.timeSlot,
          status: "pending",
        },
        attributes: ["id", "user_id", "preferred_time_slot", "entered_at", "weight"],
      });
      const entrantIds = [...new Set(entries.map((e) => e.user_id))];
      const dayStart = new Date(pool.bookingDate + "T00:00:00");
      const dayEnd = new Date(pool.bookingDate + "T23:59:59.999");
      const appts = entrantIds.length
        ? await AppointmentModel.findAll({
            where: {
              restaurateurId: pool.restaurantId,
              clientId: { [Op.in]: entrantIds },
              date: { [Op.between]: [dayStart, dayEnd] },
              status: "pending",
            },
          })
        : [];
      const apptByUser = new Map(appts.map((a) => [a.clientId, a]));
      let eligibleCount = 0;
      let blockedBy = null;
      for (const entry of entries) {
        const appt = apptByUser.get(entry.user_id);
        const start = appt
          ? new Date(appt.date)
          : slotStartTime(pool.bookingDate, entry.preferred_time_slot);
        const duration = appt ? Number(appt.original_duration) || 45 : 45;
        const occupant = await findOccupant(
          pool.restaurantId,
          start,
          duration,
          entrantIds,
        );
        if (!occupant) {
          eligibleCount += 1;
        } else if (!blockedBy) {
          blockedBy = {
            appointmentId: occupant.id,
            clientId: occupant.clientId,
            date: occupant.date,
            status: occupant.status,
          };
        }
      }
      pool.eligibleCount = eligibleCount;
      pool.blockedBy = blockedBy;
      pool.entrants = entries.map((e) => ({
        entryId: e.id,
        userId: e.user_id,
        weight: e.weight,
        enteredAt: e.entered_at,
      }));
    }

    // Batch-resolve display names (restaurants + entrants + appointment clients)
    // so the demo UI shows names instead of bare ids.
    const nameIds = [
      ...enriched.map((p) => p.restaurantId),
      ...enriched.flatMap((p) => (p.entrants || []).map((e) => e.userId)),
      ...pendingAppointmentRows.map((a) => a.clientId),
      ...enriched.map((p) => p.blockedBy?.clientId).filter(Boolean),
    ];
    const nameRows = nameIds.length
      ? await UsersModel.findAll({
          where: { id: { [Op.in]: [...new Set(nameIds)] } },
          attributes: ["id", "first_name", "last_name"],
        })
      : [];
    const nameOf = (id) => {
      const u = nameRows.find((r) => r.id === id);
      return u ? `${u.first_name} ${u.last_name}`.trim() : `User #${id}`;
    };
    for (const pool of enriched) {
      pool.restaurantName = nameOf(pool.restaurantId);
      pool.entrants = (pool.entrants || []).map((e) => ({
        ...e,
        userName: nameOf(e.userId),
      }));
      if (pool.blockedBy) {
        pool.blockedBy.clientName = nameOf(pool.blockedBy.clientId);
      }
    }
    const namedAppointments = pendingAppointments.map((a) => ({
      ...a,
      clientName: nameOf(a.clientId),
      restaurantName: nameOf(a.restaurantId),
    }));

    // Full appointment list for the demo page (any status, newest first),
    // same role scoping as above.
    const allWhere = {};
    if (role === "restaurateurs") allWhere.restaurateurId = me;
    if (role === "client") allWhere.clientId = me;
    const allAppointmentRows = await AppointmentModel.findAll({
      where: allWhere,
      attributes: ["id", "restaurateurId", "clientId", "date", "status"],
      order: [["date", "DESC"]],
      limit: 100,
    });
    const allIds = [
      ...allAppointmentRows.map((a) => a.clientId),
      ...allAppointmentRows.map((a) => a.restaurateurId),
    ];
    const allNameRows = allIds.length
      ? await UsersModel.findAll({
          where: { id: { [Op.in]: [...new Set(allIds)] } },
          attributes: ["id", "first_name", "last_name"],
        })
      : [];
    const allNameOf = (id) => {
      const u = allNameRows.find((r) => r.id === id);
      return u ? `${u.first_name} ${u.last_name}`.trim() : `User #${id}`;
    };
    const allAppointments = allAppointmentRows.map((a) => {
      const d = new Date(a.date);
      return {
        id: a.id,
        restaurantId: a.restaurateurId,
        restaurantName: allNameOf(a.restaurateurId),
        clientId: a.clientId,
        clientName: allNameOf(a.clientId),
        date: d.toISOString(),
        bookingDate: d.toISOString().slice(0, 10),
        timeSlot: getTimeSlot(d),
        status: a.status,
      };
    });

    return res.status(200).json({ pools: enriched, pendingAppointments: namedAppointments, allAppointments });
  } catch (error) {
    console.error("Error in getPendingPools:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getLotteryDemo = async (req, res) => {
  try {
    const now = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const horizon = new Date(today); horizon.setDate(horizon.getDate() + 14);

    const pendingSlots = await sequelize.query(
      `
      SELECT restaurant_id, booking_date, preferred_time_slot, COUNT(*) as count
      FROM lottery_pool
      WHERE status = 'pending'
        AND booking_date >= :today
        AND booking_date <= :horizon
      GROUP BY restaurant_id, booking_date, preferred_time_slot
      HAVING COUNT(*) >= 1
      ORDER BY booking_date ASC, preferred_time_slot ASC
      `,
      {
        replacements: {
          today: today.toISOString().slice(0, 10),
          horizon: horizon.toISOString().slice(0, 10),
        },
        type: sequelize.QueryTypes.SELECT,
      },
    );

    const enriched = pendingSlots.map((slot) => {
      const resolutionTime = getLotteryResolutionTime(slot.booking_date, slot.preferred_time_slot);
      const countdown = getLotteryCountdown(slot.booking_date, slot.preferred_time_slot);
      const ageMs = now.getTime() - new Date(resolutionTime).getTime();
      const ageHours = Math.max(0, ageMs / 3600000);
      const agingFactor = 1 - Math.pow(0.5, ageHours / 6);
      const agingBoost = 1 + Math.min(agingFactor * 3, 3);
      return {
        restaurantId: slot.restaurant_id,
        bookingDate: slot.booking_date,
        timeSlot: slot.preferred_time_slot,
        competitors: slot.count,
        resolutionTime: resolutionTime.toISOString(),
        closed: isLotteryClosed(slot.booking_date, slot.preferred_time_slot),
        countdown,
        agingBoost: Math.round(agingBoost * 100) / 100,
        timeUntilDraw: Math.max(0, Math.round((resolutionTime.getTime() - now.getTime()) / 60000)) + " min",
};
    });

    const recentHistory = await sequelize.query(
      `
      SELECT lb.restaurant_id, lb.booking_date, lb.preferred_time_slot,
             COUNT(DISTINCT CASE WHEN lb.status = 'won' THEN lb.user_id END) as winners,
             COUNT(DISTINCT CASE WHEN lb.status = 'lost' THEN lb.user_id END) as losers,
             MIN(lb.entered_at) as earliest_entry,
             MAX(lb.entered_at) as latest_entry
      FROM lottery_pool lb
      WHERE lb.status IN ('won', 'lost')
        AND lb.booking_date >= :today
        AND lb.booking_date <= :horizon
      GROUP BY lb.restaurant_id, lb.booking_date, lb.preferred_time_slot
      ORDER BY lb.booking_date DESC, lb.preferred_time_slot DESC
      LIMIT 20
      `,
      {
        replacements: { today: today.toISOString().slice(0, 10), horizon: horizon.toISOString().slice(0, 10) },
        type: sequelize.QueryTypes.SELECT,
      },
    );

    const configSummary = {
      lotteryCutoffMinutes: LOTTERY_CUTOFF_MINUTES,
      minGapMinutes: MIN_GAP_MINUTES,
      agingHalfLifeHours: 6,
      maxAgingBoost: 3,
      maxMultiplier: 4,
      schedulerIntervalMs: Number(process.env.SCHEDULER_INTERVAL_MS) || 60000,
      currentTime: now.toISOString(),
    };

    return res.status(200).json({
      message: "Lottery Demo Dashboard",
      config: configSummary,
      pendingSlots: enriched,
      recentResults: recentHistory,
    });
  } catch (error) {
    console.error("Error in getLotteryDemo:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getScoringDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await AppointmentModel.findByPk(id, {
      include: [
        {
          model: UsersModel,
          as: "client",
          attributes: ["id", "first_name", "last_name", "email"],
        },
      ],
    });

    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }

    const userId = appointment.clientId;
    const restaurantId = appointment.restaurateurId;

    const flexibilityScore = ScoringEngine.calculateFlexibility({});
    const loyaltyScore = await ScoringEngine.calculateLoyalty(userId, restaurantId);
    const penaltyScore = await ScoringEngine.calculatePenalty(userId);
    const totalWeight = await ScoringEngine.calculateTotalWeight(userId, restaurantId, {});

    return res.status(200).json({
      appointmentId: appointment.id,
      client: appointment.client
        ? `${appointment.client.first_name} ${appointment.client.last_name}`
        : "Unknown",
      flexibilityScore,
      loyaltyScore,
      penaltyScore,
      totalWeight,
      formula: "BASE(100) + flexibility × 50 + loyalty × 30 − penalty × 200",
      weights: {
        base: 100,
        flexibility: 50,
        loyalty: 30,
        penalty: 200,
      },
    });
  } catch (error) {
    console.error("Error in getScoringDetails:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

function calculateEstimatedChance(weight, competitorCount) {
  const averageCompetitorWeight = 100;
  const totalEstimatedWeight =
    weight + averageCompetitorWeight * competitorCount;
  const percentage = totalEstimatedWeight > 0
    ? (weight / totalEstimatedWeight) * 100
    : 0;
  return `${percentage.toFixed(1)}%`;
}

function calculateWeightedChance(weight, totalWeight) {
  const percentage = totalWeight > 0 ? (weight / totalWeight) * 100 : 0;
  return `${percentage.toFixed(1)}%`;
}