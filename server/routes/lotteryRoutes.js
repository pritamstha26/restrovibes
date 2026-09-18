import express from "express";
import { authenticateToken } from "../middlewares/auth.js";
import {
  enterLottery,
  getLotteryStatus,
  getAlternatives,
  manualResolve,
  getPendingPools,
  getLotteryDemo,
} from "../controllers/lotteryController.js";

const router = express.Router();

router.use(authenticateToken);

const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
};

// Admins and restaurants can resolve draws; restaurants only their own venue
// (ownership is re-checked inside manualResolve). Clients are read-only.
const staffOnly = (req, res, next) => {
  if (req.user.role !== "admin" && req.user.role !== "restaurateurs") {
    return res.status(403).json({ message: "Admin or restaurant access required" });
  }
  next();
};

router.post("/enter", enterLottery);
router.get("/status", getLotteryStatus);
router.post("/alternatives", getAlternatives);

// Scoped inside getPendingPools: admin sees all pools, restaurants see their
// own venue, clients see contests they entered.
router.get("/pending", getPendingPools);
router.post("/resolve", staffOnly, manualResolve);
router.get("/demo", adminOnly, getLotteryDemo);

export default router;