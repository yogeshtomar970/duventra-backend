import Student from "../models/Student.js";
import Society from "../models/Society.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { sendOtpEmail } from "../utils/mailer.js";

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    // Check Student first
    let user = await Student.findOne({ email });
    let role = "student";

    // Then check Society
    if (!user) {
      user = await Society.findOne({ email });
      role = "society";
    }

    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }
    const token = jwt.sign(
      { id: user._id, role },
      process.env.JWT_SECRET,
      { expiresIn:"7d"}
    )
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      role,
      user: {
        id: user._id,
        email: user.email,
        // name: for display in comments/likes
        name: role === "society" ? user.societyName : user.name,
        // societyId exists only for societies
        societyId: user.societyId || null,
        // userId exists only for students
        userId: user.userId || null,
        profilePic: user.profilePic || null,
      },
    });
  } catch (error) {
    console.error("loginUser error:", error.message);
    res.status(500).json({ message: error.message });
  }
};

// Email se Student ya Society dhundo
const findUserByEmail = async (email) => {
  let user = await Student.findOne({ email });
  if (user) return { user, Model: Student };
  user = await Society.findOne({ email });
  if (user) return { user, Model: Society };
  return { user: null, Model: null };
};

// ── POST /api/auth/forgot-password — body: { email } ──────────────────────────
// Email exist karta hai toh OTP generate karke email pe bhejta hai
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const { user } = await findUserByEmail(email);

    // Security: chahe email exist kare ya na kare, same message do
    // (taaki koi yeh pata na laga sake ki konse emails registered hain)
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If this email is registered, an OTP has been sent.",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
    user.resetOtp = otp;
    user.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minute
    await user.save();

    await sendOtpEmail(email, otp);

    res.status(200).json({
      success: true,
      message: "If this email is registered, an OTP has been sent.",
    });
  } catch (error) {
    console.error("forgotPassword error:", error.message);
    res.status(500).json({ message: "Server error, try again later" });
  }
};

// ── POST /api/auth/verify-otp — body: { email, otp } ──────────────────────────
export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP are required" });

    const { user } = await findUserByEmail(email);
    if (!user || !user.resetOtp) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (user.resetOtpExpiry < new Date()) {
      return res.status(400).json({ message: "OTP expired, please try again." });
    }

    if (user.resetOtp !== otp) {
      return res.status(400).json({ message: "Incorrect OTP" });
    }

    // OTP sahi hai — ek short-lived reset token do (5 min) taaki reset-password
    // call directly OTP dobara verify na kare, aur OTP repeated guessing na ho
    const resetToken = jwt.sign(
      { email, purpose: "password_reset" },
      process.env.JWT_SECRET,
      { expiresIn: "5m" },
    );

    res.status(200).json({ success: true, resetToken });
  } catch (error) {
    console.error("verifyOtp error:", error.message);
    res.status(500).json({ message: "Server error, try again later" });
  }
};

// ── POST /api/auth/reset-password — body: { resetToken, newPassword } ────────
export const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;
    if (!resetToken || !newPassword)
      return res
        .status(400)
        .json({ message: "Reset token and new password are required" });

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters long" });
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (err) {
      return res
        .status(400)
        .json({ message: "Reset link expired; request the OTP again." });
    }

    if (decoded.purpose !== "password_reset") {
      return res.status(400).json({ message: "Invalid reset token" });
    }

    const { user } = await findUserByEmail(decoded.email);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtp = null;
    user.resetOtpExpiry = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successful; please log in now.",
    });
  } catch (error) {
    console.error("resetPassword error:", error.message);
    res.status(500).json({ message: "Server error, try again later" });
  }
};

