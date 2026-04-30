import express from "express";
import { uploadProfilePic } from "../middlewares/upload.js";
import { societySignup, getSocietyProfile, getSocietyPublicProfile, updateSocietyProfile, addCommitteeMember, removeCommitteeMember } from "../controllers/societyController.js";

const router = express.Router();

router.post("/signup", societySignup);
router.get("/public/:societyId", getSocietyPublicProfile);
router.get("/profile/:id", getSocietyProfile);
router.put("/update/:id", uploadProfilePic.single("profilePic"), updateSocietyProfile);
router.post("/committee/:id", addCommitteeMember);
router.delete("/committee/:id", removeCommitteeMember);

export default router;
