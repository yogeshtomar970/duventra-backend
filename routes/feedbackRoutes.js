// ============================================================
// feedbackRoutes.js — FIXED
// ============================================================
import express from "express";
import { submitFeedback, getAllFeedback } from "../controllers/feedbackController.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

router.post("/", verifyToken, submitFeedback);   // 🔒 login required to submit
router.get("/", verifyToken, getAllFeedback);     // 🔒 only logged-in users (ideally only admins) can read

export default router;
