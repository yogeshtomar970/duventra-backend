import express from "express";
import {
  getNotifications,
  getUnreadCount,
  markAllRead,
  markOneRead,
} from "../controllers/notificationController.js";

const router = express.Router();

// ⚠️ IMPORTANT: specific routes BEFORE dynamic /:id routes
router.get("/unread/:recipientId", getUnreadCount);   // must be before /:recipientId
router.put("/read-all", markAllRead);
router.put("/read/:id", markOneRead);
router.get("/:recipientId", getNotifications);

export default router;
