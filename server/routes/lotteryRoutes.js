import express from "express";
import { authenticateToken } from "../middlewares/auth.js";
import {
  enterLottery,
  getLotteryStatus,
  getAlternatives,
  manualResolve,
  getPendingPools,
} from "../controllers/lotteryController.js";

const router = express.Router();

router.use(authenticateToken);

const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

router.post("/enter", enterLottery);
router.get("/status", getLotteryStatus);
router.post("/alternatives", getAlternatives);

router.get("/pending", adminOnly, getPendingPools);
router.post("/resolve", adminOnly, manualResolve);

export default router;