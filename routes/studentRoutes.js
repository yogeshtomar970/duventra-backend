// ============================================================
// studentRoutes.js — FIXED
// ============================================================
import express from "express";
import {
  studentSignup,
  getStudentProfile,
  getStudentPublicProfile,
  getStudentByUserId,
  searchStudentByName,
  updateStudentProfile,
  getStudentSuggestions,
  followStudent,
  unfollowStudent,
  getStudentFollowing,
  getStudentMembers,
  checkStudentFollow,
} from "../controllers/studentController.js";
import { uploadIdCard, uploadProfilePic } from "../middlewares/upload.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

// Public routes (signup, public profiles, search)
router.post("/signup", uploadIdCard.single("idCard"), studentSignup);
router.get("/public/:userId", getStudentPublicProfile);
router.get("/search/by-name", searchStudentByName);
router.get("/check-follow/:followerId/:studentId", checkStudentFollow);  // ✅ public check is fine
router.get("/:id", getStudentByUserId);

// Protected routes
router.get("/profile/:id", verifyToken, getStudentProfile);             // 🔒 private profile
router.get("/suggestions/:studentId", verifyToken, getStudentSuggestions); // 🔒
router.get("/following/:studentId", verifyToken, getStudentFollowing);  // 🔒
router.get("/members/:studentId", verifyToken, getStudentMembers);      // 🔒
router.post("/follow", verifyToken, followStudent);                     // 🔒
router.post("/unfollow", verifyToken, unfollowStudent);                 // 🔒
router.put("/update/:id", verifyToken, uploadProfilePic.single("profilePic"), updateStudentProfile); // 🔒

export default router;
