import express from "express";
import { uploadProfilePic } from "../middlewares/upload.js";
import { protect } from "../middlewares/auth.js";
import { societySignup, verifySocietyEmail, getSocietyProfile, getSocietyPublicProfile, updateSocietyProfile, addCommitteeMember, removeCommitteeMember } from "../controllers/societyController.js";

const router = express.Router();

router.post("/verify-email", verifySocietyEmail);
router.post("/signup", societySignup);
router.get("/public/:societyId", getSocietyPublicProfile);
router.get("/profile/:id", getSocietyProfile);
router.put("/update/:id", protect, uploadProfilePic.single("profilePic"), updateSocietyProfile);
router.post("/committee/:id", protect, addCommitteeMember);
router.delete("/committee/:id", protect, removeCommitteeMember);

export default router;