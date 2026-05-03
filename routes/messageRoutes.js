// ============================================================
// messageRoutes.js — FIXED
// ============================================================
import express from "express";
import { sendMessage, getConversation, getInbox, searchUsers, deleteMessage, deleteConversation } from "../controllers/messageController.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

// All message routes require login
router.post("/send",                              verifyToken, sendMessage);
router.get("/inbox/:myId",                        verifyToken, getInbox);
router.get("/conversation/:myId/:otherId",        verifyToken, getConversation);
router.delete("/conversation/:myId/:otherId",     verifyToken, deleteConversation);
router.get("/search",                             verifyToken, searchUsers);
router.delete("/:messageId",                      verifyToken, deleteMessage);

export default router;
