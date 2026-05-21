import express from "express";
import { protect } from "../middlewares/auth.js";
import {
  sendMessage,
  getConversation,
  getInbox,
  searchUsers,
  deleteMessage,
  deleteConversation,
} from "../controllers/messageController.js";

const router = express.Router();

router.post("/send",protect, sendMessage);
router.get("/inbox/:myId",protect, getInbox);
router.get("/conversation/:myId/:otherId",protect, getConversation);
router.delete("/conversation/:myId/:otherId",protect, deleteConversation);
router.get("/search", searchUsers);
router.delete("/:messageId", protect,deleteMessage);

export default router;
