import express from "express";
import { uploadTableImages, deleteTableImage } from "../controllers/uploadController.js";
import upload from "../middlewares/upload.js";

const router = express.Router();

router.post("/tables/:id/images", upload.array("images", 10), uploadTableImages);
router.delete("/tables/:id/images/:filename", deleteTableImage);

export default router;
