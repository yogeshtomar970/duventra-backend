import express from "express";
import {
  loginUser,
  forgotPassword,
  verifyOtp,
  resetPassword,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);

export default router;
