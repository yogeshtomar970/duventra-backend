import Student from "../models/Student.js";
import Society from "../models/Society.js";
import bcrypt from "bcryptjs";

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

    res.status(200).json({
      success: true,
      message: "Login successful",
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
