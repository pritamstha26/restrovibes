import { Op } from "sequelize";
import { LotteryPoolModel, BookingHistoryModel, UsersModel } from "../models/model.js";
import AppointmentModel from "../models/appointmentModel.js";
import sequelize from "../config/db.js";
import { ScoringEngine } from "../utils/scoring.js";
import { getWeightedEntries, selectWeightedEntry, getEffectiveWeight } from "../utils/weightedLottery.js";
import { getLotteryResolutionTime, isLotteryClosed, slotStartTime } from "../utils/lotteryTime.js";

const BOOKING_BUFFER_MINUTES = Number(process.env.BOOKING_BUFFER_MINUTES) || 15;

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

    const resolutionTime = getLotteryResolutionTime(bookingDate, preferredTimeSlot);
    if (isLotteryClosed(bookingDate, preferredTimeSlot)) {
      return res.status(409).json({
        message: "This slot's lottery has closed. Choose another time or review alternatives.",
        resolutionTime,
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
  { force = false } = {},
) => {
  try {
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
      if (Date.now() < latestDeadline) {
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
    const weightedEntries = getWeightedEntries(contestants);

    let winner;
    let winnerWeight;
    if (contestants.length === 1) {
      winner = contestants[0];
      winnerWeight = getEffectiveWeight(
        winner.weight,
        winner.entered_at,
        new Date(),
      );
    } else {
      const selected = selectWeightedEntry(contestants);
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

    return {
      winner: {
        userId: winner.user_id,
        weight: winnerWeight,
        entryId: winner.id,
        appointmentId: winnerAppointment ? winnerAppointment.id : null,
      },
      totalEntries,
      winnerChance,
      competitorCount,
      groupedSlots,
      losers: group
        .filter((entry) => entry.id !== winner.id)
        .map((entry) => ({
          userId: entry.user_id,
          weight:
            weightedEntries.find((item) => item.entry.id === entry.id)
              ?.effectiveWeight ??
            getEffectiveWeight(entry.weight, entry.entered_at, new Date()),
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
    const { restaurantId, bookingDate, timeSlot } = req.body;

    if (
      typeof restaurantId !== "number" ||
      typeof bookingDate !== "string" ||
      typeof timeSlot !== "number"
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const result = await resolveLottery(restaurantId, bookingDate, timeSlot, {
      force: true,
    });

    if (!result) {
      return res.status(200).json({ message: "No pending entries found" });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in manualResolve:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Admin/demo helper: list every slot that currently has pending lottery entries.
export const getPendingPools = async (req, res) => {
  try {
    const pools = await sequelize.query(
      `
      SELECT
        restaurant_id,
        to_char(booking_date, 'YYYY-MM-DD') AS booking_date,
        preferred_time_slot,
        COUNT(*)::int AS competitors
      FROM lottery_pool
      WHERE status = 'pending'
      GROUP BY restaurant_id, booking_date, preferred_time_slot
      ORDER BY booking_date ASC, preferred_time_slot ASC
      `,
      { type: sequelize.QueryTypes.SELECT },
    );

    const enriched = pools.map((pool) => ({
      restaurantId: pool.restaurant_id,
      bookingDate: pool.booking_date,
      timeSlot: pool.preferred_time_slot,
      competitors: pool.competitors,
      resolutionTime: getLotteryResolutionTime(pool.booking_date, pool.preferred_time_slot),
      closed: isLotteryClosed(pool.booking_date, pool.preferred_time_slot),
    }));

    return res.status(200).json({ pools: enriched });
  } catch (error) {
    console.error("Error in getPendingPools:", error);
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