import AppointmentModel from "./models/appointmentModel.js";
import { Op } from "sequelize";
import sequelize from "./config/db.js";
import { BookingHistoryModel } from "./models/model.js";
import { ScoringEngine } from "./utils/scoring.js";

const GRACE_MINUTES = Number(process.env.OVERSTAY_GRACE_MINUTES) || 10;
const CHECK_INTERVAL_MS = 60 * 1000; // every minute

const createHistoryEntry = async (appointment, status) => {
  try {
    const dateOnly = appointment.date
      ? new Date(appointment.date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);

    const timeSlot = appointment.date
      ? Math.floor(new Date(appointment.date).getHours() * 4 + new Date(appointment.date).getMinutes() / 15)
      : 0;

    await BookingHistoryModel.create({
      user_id: appointment.clientId,
      restaurant_id: appointment.restaurateurId,
      booking_date: dateOnly,
      booking_time_slot: timeSlot,
      party_size: appointment.party_size || 1,
      status,
    });
  } catch (historyErr) {
    console.error("Failed to create booking history entry:", historyErr);
  }
};

export function startOverstayWorker() {
  console.log("Starting overstay worker (grace minutes:", GRACE_MINUTES, ")");

  setInterval(async () => {
    try {
      const now = new Date();
      const threshold = new Date(now.getTime() - 0);
      // find appointments that are accepted or in_progress and whose end_time + GRACE <= now
      const overdue = await AppointmentModel.findAll({
        where: {
          status: { [Op.in]: ["accepted", "in_progress", "pending"] },
          end_time: { [Op.ne]: null },
        },
      });

      for (const apt of overdue) {
        const end = new Date(apt.extended_until || apt.end_time);
        const expireAt = new Date(end.getTime() + GRACE_MINUTES * 60 * 1000);
        if (expireAt <= now) {
          try {
            if (apt.status === "in_progress") {
              apt.status = "completed";
              await apt.save();
              await createHistoryEntry(apt, "overstayed");
              await ScoringEngine.recalculateUserPenalty(apt.clientId);
              console.log("Auto-completed appointment", apt.id, "due to overstay/expiry");
            } else {
              apt.status = "no_show";
              await apt.save();
              await createHistoryEntry(apt, "no_show");
              await ScoringEngine.recalculateUserPenalty(apt.clientId);
              console.log("Marked appointment", apt.id, "as no_show due to expiry");
            }
          } catch (err) {
            console.warn("Failed to handle expired apt", apt.id, err.message || err);
          }
        }
      }
    } catch (err) {
      console.error("Overstay worker error:", err.message || err);
    }
  }, CHECK_INTERVAL_MS);
}
