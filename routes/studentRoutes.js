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

const router = express.Router();

router.post("/signup", uploadIdCard.single("idCard"), studentSignup);
router.get("/profile/:id", getStudentProfile);
router.get("/public/:userId", getStudentPublicProfile);
router.get("/check-follow/:followerId/:studentId", checkStudentFollow);
router.get("/suggestions/:studentId", getStudentSuggestions);
router.get("/following/:studentId", getStudentFollowing);
router.get("/members/:studentId", getStudentMembers);
router.post("/follow", followStudent);
router.post("/unfollow", unfollowStudent);
router.get("/search/by-name", searchStudentByName);

router.get("/:id", getStudentByUserId);
router.put("/update/:id", uploadProfilePic.single("profilePic"), updateStudentProfile);

export default router;
