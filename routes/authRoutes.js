import express from "express";
import {
  loginUser,
  checkEmail,
  resetPassword,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/login", loginUser);
router.post("/check-email", checkEmail);
router.post("/reset-password", resetPassword);

export default router;
