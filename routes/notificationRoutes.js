import express from "express";
import {
  getNotifications,
  getUnreadCount,
  markAllRead,
  markOneRead,
  deleteSelected,
  deleteAll,
} from "../controllers/notificationController.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

router.get("/unread/:recipientId", protect, getUnreadCount);
router.put("/read-all", protect, markAllRead);
router.put("/read/:id", protect, markOneRead);
router.delete("/delete-selected", protect, deleteSelected);
router.delete("/delete-all", protect, deleteAll);
router.get("/:recipientId", protect, getNotifications);

export default router;