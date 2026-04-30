import express from "express";
import { sendMessage, getConversation, getInbox, searchUsers, deleteMessage, deleteConversation } from "../controllers/messageController.js";

const router = express.Router();

router.post("/send",                                sendMessage);
router.get("/inbox/:myId",                          getInbox);
router.get("/conversation/:myId/:otherId",          getConversation);
router.delete("/conversation/:myId/:otherId",       deleteConversation);
router.get("/search",                               searchUsers);
router.delete("/:messageId",                        deleteMessage);

export default router;
