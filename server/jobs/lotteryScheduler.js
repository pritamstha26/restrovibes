import { Op } from "sequelize";
import sequelize from "../config/db.js";
import { LotteryPoolModel } from "../models/model.js";
import { resolveLottery } from "../controllers/lotteryController.js";
import { getLotteryEarliestResolutionTime } from "../utils/lotteryTime.js";

const RESOLUTION_HORIZON_DAYS = Number(process.env.LOTTERY_RESOLUTION_HORIZON_DAYS) || 14;

class LotteryScheduler {
  constructor() {
    this.interval = null;
  }

  start() {
    this.processPendingLotteries();
    this.interval = setInterval(() => {
      this.processPendingLotteries();
    }, 60 * 1000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async processPendingLotteries() {
    try {
      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const horizon = new Date(today);
      horizon.setDate(horizon.getDate() + RESOLUTION_HORIZON_DAYS);

      const pendingSlots = await sequelize.query(
        `
        SELECT restaurant_id, booking_date, preferred_time_slot, COUNT(*) as count
        FROM lottery_pool
        WHERE status = 'pending'
          AND booking_date >= :today
          AND booking_date <= :horizon
        GROUP BY restaurant_id, booking_date, preferred_time_slot
        HAVING COUNT(*) >= 1
        `,
        {
          replacements: {
            today: today.toISOString().slice(0, 10),
            horizon: horizon.toISOString().slice(0, 10),
          },
          type: sequelize.QueryTypes.SELECT,
        },
      );

      for (const slot of pendingSlots) {
        try {
          // Only draw slots whose deadline has passed AND minimum duration met; slots still open keep accepting entries.
          const earliestResolution = getLotteryEarliestResolutionTime(
            slot.booking_date,
            slot.preferred_time_slot,
            now,
          );
          if (now.getTime() < earliestResolution.getTime()) continue;

          const result = await resolveLottery(
            slot.restaurant_id,
            slot.booking_date,
            slot.preferred_time_slot,
          );

          if (result) {
            const slots = result.groupedSlots?.length
              ? ` grouped slots [${result.groupedSlots.join(", ")}]`
              : "";
            const outcome = result.winner
              ? `winner user ${result.winner.userId} with chance ${result.winnerChance}`
              : `no winner — slot still occupied`;
            console.log(
              `[Lottery] Resolved restaurant ${slot.restaurant_id} on ${slot.booking_date} slot ${slot.preferred_time_slot}${slots}: ${outcome}`,
            );
          }
        } catch (error) {
          console.error(
            `[Lottery] Failed to resolve slot ${slot.restaurant_id} ${slot.booking_date} ${slot.preferred_time_slot}:`,
            error,
          );
        }
      }

      await LotteryPoolModel.update(
        { status: "expired" },
        {
          where: {
            status: "pending",
            booking_date: {
              [Op.lt]: today.toISOString().slice(0, 10),
            },
          },
        },
      );
    } catch (error) {
      console.error("[Lottery] Scheduler error:", error);
    }
  }
}

export const lotteryScheduler = new LotteryScheduler();