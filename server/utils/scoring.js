import { Op } from "sequelize";
import { BookingHistoryModel, UsersModel } from "../models/model.js";

export class ScoringEngine {
  static calculateFlexibility(preferences = {}) {
    const {
      flexibilityRangeMinutes = 0,
      alternativeDates = [],
      alternativePartySize = false,
    } = preferences;

    let score = 0;

    if (flexibilityRangeMinutes <= 30) {
      score = 0.4;
    } else if (flexibilityRangeMinutes <= 60) {
      score = 0.7;
    } else if (flexibilityRangeMinutes > 60) {
      score = 1.0;
    }

    const alternativeDateBonus = Math.min(alternativeDates.length, 3) * 0.1;
    score += alternativeDateBonus;

    if (alternativePartySize) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  static async calculateLoyalty(userId, restaurantId) {
    const restaurantSpecific = await BookingHistoryModel.count({
      where: {
        user_id: userId,
        restaurant_id: restaurantId,
        status: "completed",
      },
    });

    const platformWide = await BookingHistoryModel.count({
      where: {
        user_id: userId,
        status: "completed",
      },
    });

    const user = await UsersModel.findByPk(userId, {
      attributes: ["account_created_at"],
    });

    let accountAgeDays = 0;
    if (user && user.account_created_at) {
      const diff = new Date() - new Date(user.account_created_at);
      accountAgeDays = diff / (1000 * 60 * 60 * 24);
    }

    let restaurantScore = 0;
    if (restaurantSpecific >= 6) {
      restaurantScore = 1.0;
    } else if (restaurantSpecific >= 3) {
      restaurantScore = 0.6;
    } else if (restaurantSpecific >= 1) {
      restaurantScore = 0.3;
    }

    let platformScore = 0;
    if (platformWide >= 10) {
      platformScore = 1.0;
    } else if (platformWide >= 3) {
      platformScore = 0.5;
    }

    let ageScore = 0;
    if (accountAgeDays >= 365) {
      ageScore = 1.0;
    } else if (accountAgeDays >= 181) {
      ageScore = 0.6;
    } else if (accountAgeDays >= 31) {
      ageScore = 0.3;
    }

    return (
      restaurantScore * 0.5 +
      platformScore * 0.3 +
      ageScore * 0.2
    );
  }

  static async calculatePenalty(userId) {
    const counts = await BookingHistoryModel.findAll({
      where: { user_id: userId },
      attributes: [
        "status",
        [BookingHistoryModel.sequelize.fn("COUNT", BookingHistoryModel.sequelize.col("id")), "count"],
      ],
      group: ["status"],
      raw: true,
    });

    const map = {};
    for (const row of counts) {
      map[row.status] = parseInt(row.count, 10);
    }

    const completed = map.completed || 0;
    const noShows = map.no_show || 0;
    const lateCancellations = map.late_cancelled || 0;
    const overstays = map.overstayed || 0;
    const totalBookings = completed + noShows + lateCancellations + overstays;

    if (totalBookings === 0) {
      return 0;
    }

    const rawPenalty = (noShows * 0.7 + lateCancellations * 0.3 + overstays * 0.15) / totalBookings;
    const decay = completed * 0.05;

    let penalty = rawPenalty - decay;
    if (penalty < 0) penalty = 0;
    if (penalty > 1) penalty = 1;

    return penalty;
  }

  static async calculateTotalWeight(userId, restaurantId, preferences = {}) {
    const BASE_WEIGHT = 100;
    const flexibilityScore = this.calculateFlexibility(preferences);
    const loyaltyScore = await this.calculateLoyalty(userId, restaurantId);
    const penaltyScore = await this.calculatePenalty(userId);

    const totalWeight =
      BASE_WEIGHT +
      flexibilityScore * 50 +
      loyaltyScore * 30 -
      penaltyScore * 200;

    return Math.max(totalWeight, 1);
  }

  static async predictCancellation(restaurantId, date, timeSlot) {
    const now = new Date();
    const targetDate = new Date(date);
    const daysUntil = (targetDate - now) / (1000 * 60 * 60 * 24);

    const historical = await BookingHistoryModel.count({
      where: {
        restaurant_id: restaurantId,
        booking_date: date,
        booking_time_slot: timeSlot,
        status: {
          [Op.or]: ["late_cancelled", "no_show"],
        },
      },
    });

    const total = await BookingHistoryModel.count({
      where: {
        restaurant_id: restaurantId,
        booking_date: date,
        booking_time_slot: timeSlot,
      },
    });

    let rate = total > 0 ? historical / total : 0.35;

    let multiplier = 1;
    if (daysUntil <= 1) {
      multiplier = 1.5;
    } else if (daysUntil <= 3) {
      multiplier = 1.2;
    }

    const predicted = rate * multiplier;
    if (predicted > 0.95) return 0.95;
    if (predicted < 0) return 0;

    return predicted;
  }
}