// ============================================================
// likeRoutes.js — FIXED
// ============================================================
import express from "express";
import { toggleLike, getLikes } from "../controllers/likeController.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

router.get("/:postId/:userId", getLikes);           // ✅ public
router.post("/toggle", verifyToken, toggleLike);    // 🔒

export default router;
