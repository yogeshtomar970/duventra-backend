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

    // Check Student first, then Society
    let user = await Student.findOne({ email });
    let role = "student";

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

    // ✅ FIXED: Generate JWT token (was missing before)
    const token = jwt.sign( 
      { id: user._id, role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,   // ← Send token to client
      role,
      user: {
        id: user._id,
        email: user.email,
        name: role === "society" ? user.societyName : user.name,
        societyId: user.societyId || null,
        userId: user.userId || null,
        profilePic: user.profilePic || null,
      },
    });
  } catch (error) {
    console.error("loginUser error:", error.message);
    res.status(500).json({ message: error.message });
  }
};
