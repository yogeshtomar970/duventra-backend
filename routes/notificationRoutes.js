import express from "express";
import {
  getNotifications,
  getUnreadCount,
  markAllRead,
  markOneRead,
  deleteSelected,
  deleteAll,
} from "../controllers/notificationController.js";

const router = express.Router();

router.get("/unread/:recipientId", getUnreadCount);
router.put("/read-all", markAllRead);
router.put("/read/:id", markOneRead);
router.delete("/delete-selected", deleteSelected);
router.delete("/delete-all", deleteAll);
router.get("/:recipientId", getNotifications);

export default router;
