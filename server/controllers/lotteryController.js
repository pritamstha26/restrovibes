import { Op } from "sequelize";
import { LotteryPoolModel, BookingHistoryModel, UsersModel } from "../models/model.js";
import AppointmentModel from "../models/appointmentModel.js";
import { ScoringEngine } from "../utils/scoring.js";
import { getWeightedEntries, selectWeightedEntry } from "../utils/weightedLottery.js";

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

    return res.status(200).json({ entries });
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

export const resolveLottery = async (restaurantId, bookingDate, timeSlot) => {
  try {
    const entries = await LotteryPoolModel.findAll({
      where: {
        restaurant_id: restaurantId,
        booking_date: bookingDate,
        preferred_time_slot: timeSlot,
        status: "pending",
      },
      order: [["weight", "DESC"]],
    });

    if (!entries.length) {
      return null;
    }

    const weightedEntries = getWeightedEntries(entries);
    const selected = selectWeightedEntry(entries);
    const winner = selected.entry;

    const winnerId = winner.id;
    const winnerWeight = selected.effectiveWeight;

    await LotteryPoolModel.update(
      { status: "won" },
      { where: { id: winnerId } },
    );

    const loserIds = entries
      .filter((entry) => entry.id !== winnerId)
      .map((entry) => entry.id);

    if (loserIds.length) {
      await LotteryPoolModel.update(
        { status: "lost" },
        { where: { id: loserIds } },
      );
    }

    const totalEntries = entries.length;
    const competitorCount = totalEntries - 1;
    const totalWeight = weightedEntries.reduce(
      (sum, item) => sum + item.effectiveWeight,
      0,
    );
    const winnerChance = calculateWeightedChance(winnerWeight, totalWeight);

    const dayStart = new Date(bookingDate + "T00:00:00");
    const dayEnd = new Date(bookingDate + "T23:59:59.999");

    const winnerAppointment = await AppointmentModel.findOne({
      where: {
        clientId: winner.user_id,
        restaurateurId: winner.restaurant_id,
        date: { [Op.between]: [dayStart, dayEnd] },
        status: "pending",
      },
      order: [["date", "DESC"]],
    });

    if (winnerAppointment) {
      await AppointmentModel.update(
        { status: "accepted" },
        { where: { id: winnerAppointment.id } },
      );
    }

    for (const loser of entries.filter((e) => e.id !== winnerId)) {
      const loserAppointment = await AppointmentModel.findOne({
        where: {
          clientId: loser.user_id,
          restaurateurId: loser.restaurant_id,
          date: { [Op.between]: [dayStart, dayEnd] },
          status: "pending",
        },
        order: [["date", "DESC"]],
      });

      if (loserAppointment) {
        await AppointmentModel.update(
          { status: "cancelled" },
          { where: { id: loserAppointment.id } },
        );
      }
    }

    return {
      winner: {
        userId: winner.user_id,
        weight: winnerWeight,
        entryId: winnerId,
        appointmentId: winnerAppointment ? winnerAppointment.id : null,
      },
      totalEntries,
      winnerChance,
      competitorCount,
      losers: entries
        .filter((e) => e.id !== winnerId)
        .map((e) => ({
          userId: e.user_id,
          weight: weightedEntries.find((item) => item.entry.id === e.id).effectiveWeight,
          entryId: e.id,
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

    const result = await resolveLottery(restaurantId, bookingDate, timeSlot);

    if (!result) {
      return res.status(200).json({ message: "No pending entries found" });
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in manualResolve:", error);
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