import express from "express";
import {
  createAppointment,
  getAllAppointment,
  updateAppointment,
  deleteAppointment,
  getAppointmentById,
  getAppointmentsBybarbarId,
  getAppointmentsByClientId,
  confirmAppointment,
  cancelAppointment,
  completeAppointment,
  extendAppointment,
  checkSlotAvailability,
  markNoShow,
  markArrival,
  getClientRiskProfile,
} from "../controllers/appointmentController.js";
import { UsersModel } from "../models/model.js";
import { ScoringEngine } from "../utils/scoring.js";

const router = express.Router();

router.post("/", createAppointment);

// Availability check
router.get("/check-availability", checkSlotAvailability);

// Administrative and data fetching endpoints
router.get("/all", getAllAppointment);
router.get("/restaurateurs/:restaurateurId", getAppointmentsBybarbarId);
router.get("/client/:clientId", getAppointmentsByClientId);
router.get("/:id", getAppointmentById);

// Status transitions and modifications
router.put("/:id", updateAppointment);
router.put("/:id/confirm", confirmAppointment);
router.put("/:id/cancel", cancelAppointment);
router.put("/:id/complete", completeAppointment);
router.put("/:id/no-show", markNoShow);
router.put("/:id/arrived", markArrival);
router.post("/:id/extend", extendAppointment);

// Client risk profile
router.get("/client/:clientId/risk-profile", getClientRiskProfile);

// Backfill penalties for all users (run once)
router.post("/admin/backfill-penalties", async (req, res) => {
  try {
    const users = await UsersModel.findAll({ where: { role: "client" }, attributes: ["id"], raw: true });
    let updated = 0;
    for (const u of users) {
      await ScoringEngine.recalculateUserPenalty(u.id);
      updated++;
    }
    res.json({ message: `Recalculated penalties for ${updated} clients` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Deletions
router.delete("/:id", deleteAppointment);

export default router;
