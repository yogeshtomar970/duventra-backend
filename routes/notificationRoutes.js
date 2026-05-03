// ============================================================
// notificationRoutes.js — FIXED
// ============================================================
import express from "express";
import {
  getNotifications,
  getUnreadCount,
  markAllRead,
  markOneRead,
} from "../controllers/notificationController.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

// All notification routes require login (these are personal data)
router.get("/unread/:recipientId",  verifyToken, getUnreadCount);
router.put("/read-all",             verifyToken, markAllRead);
router.put("/read/:id",             verifyToken, markOneRead);
router.get("/:recipientId",         verifyToken, getNotifications);

export default router;
