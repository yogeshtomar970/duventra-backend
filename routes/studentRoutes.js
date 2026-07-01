import express from "express";
import {
  studentSignup,
  verifyStudent,
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
import { protect } from "../middlewares/auth.js";

const router = express.Router();

router.post("/verify", verifyStudent);       // ← step 1: details validate
router.post("/signup", uploadIdCard.single("idCard"), studentSignup);  // ← step 2: actual signup
router.get("/profile/:id", getStudentProfile);
router.get("/public/:userId", getStudentPublicProfile);
router.get("/check-follow/:followerId/:studentId", checkStudentFollow);
router.get("/suggestions/:studentId", getStudentSuggestions);
router.get("/following/:studentId", getStudentFollowing);
router.get("/members/:studentId", getStudentMembers);
router.post("/follow",protect, followStudent);
router.post("/unfollow",protect, unfollowStudent);
router.get("/search/by-name", searchStudentByName);

router.get("/:id", getStudentByUserId);
router.put("/update/:id",protect, uploadProfilePic.single("profilePic"), updateStudentProfile);

export default router;