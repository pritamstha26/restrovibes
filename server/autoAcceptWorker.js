import { Op } from "sequelize";
import AppointmentModel from "./models/appointmentModel.js";
import sequelize from "./config/db.js";

const GRACE_MINUTES = parseInt(process.env.AUTO_ACCEPT_GRACE_MINUTES || "20", 10);
const CHECK_INTERVAL = 2 * 60 * 1000; // check every 2 minutes

let interval = null;

export function startAutoAcceptWorker() {
  console.log(`[AutoAccept] Starting worker (grace: ${GRACE_MINUTES} min)`);
  processEligibleAppointments();
  interval = setInterval(processEligibleAppointments, CHECK_INTERVAL);
}

export function stopAutoAcceptWorker() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

async function processEligibleAppointments() {
  try {
    const cutoff = new Date(Date.now() - GRACE_MINUTES * 60 * 1000);

    const stalePending = await AppointmentModel.findAll({
      where: {
        status: "pending",
        createdAt: { [Op.lte]: cutoff },
      },
    });

    if (!stalePending.length) return;

    // Group by slot (restaurant + same hour)
    const slotMap = {};
    for (const apt of stalePending) {
      const slotKey = `${apt.restaurateurId}_${new Date(apt.date).toISOString().slice(0, 13)}`;
      if (!slotMap[slotKey]) slotMap[slotKey] = [];
      slotMap[slotKey].push(apt);
    }

    for (const [slotKey, apts] of Object.entries(slotMap)) {
      if (apts.length === 1) {
        // No competition — auto-accept
        const apt = apts[0];
        await apt.update({ status: "accepted" });
        console.log(`[AutoAccept] Auto-accepted appointment ${apt.id} (client ${apt.clientId}) — no competition`);
      } else {
        console.log(`[AutoAccept] Slot ${slotKey} has ${apts.length} pending — requires manual review`);
      }
    }
  } catch (error) {
    console.error("[AutoAccept] Worker error:", error.message);
  }
}
