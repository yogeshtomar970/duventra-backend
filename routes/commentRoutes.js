// ============================================================
// commentRoutes.js — FIXED
// ============================================================
import express from "express";
import { addComment, getComments } from "../controllers/commentController.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

router.get("/:postId", getComments);              // ✅ public
router.post("/add", verifyToken, addComment);     // 🔒

export default router;
