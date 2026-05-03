// ============================================================
// societyRoutes.js — FIXED
// ============================================================
import express from "express";
import { uploadProfilePic } from "../middlewares/upload.js";
import { societySignup, getSocietyProfile, getSocietyPublicProfile, updateSocietyProfile, addCommitteeMember, removeCommitteeMember } from "../controllers/societyController.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

// Public routes
router.post("/signup", societySignup);
router.get("/public/:societyId", getSocietyPublicProfile);

// Protected routes
router.get("/profile/:id", verifyToken, getSocietyProfile);           // 🔒
router.put("/update/:id", verifyToken, uploadProfilePic.single("profilePic"), updateSocietyProfile); // 🔒
router.post("/committee/:id", verifyToken, addCommitteeMember);       // 🔒
router.delete("/committee/:id", verifyToken, removeCommitteeMember);  // 🔒

export default router;
