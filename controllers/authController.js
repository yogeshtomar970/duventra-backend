import Student from "../models/Student.js";
import Society from "../models/Society.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

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

// ── POST /api/auth/check-email — body: { email } ──────────────────────────────
// Email database mein hai ya nahi check karta hai
export const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    
    const { user } = await findUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: "Yeh email registered nahi hai" });
    }

    res.status(200).json({ success: true, message: "Email mil gaya" });
  } catch (error) {
    console.error("checkEmail error:", error.message);
    res.status(500).json({ message: "Server error, try again later" });
  }
};

// ── POST /api/auth/reset-password — body: { email, newPassword } ─────────────
export const resetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword)
      return res
        .status(400)
        .json({ message: "Email and new password are required" });

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Password kam se kam 6 characters ka hona chahiye" });
    }

    const { user } = await findUserByEmail(email);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset ho gaya, ab login karein",
    });
  } catch (error) {
    console.error("resetPassword error:", error.message);
    res.status(500).json({ message: "Server error, try again later" });
  }
};
