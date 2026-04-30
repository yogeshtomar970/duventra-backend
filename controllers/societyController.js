import Society from "../models/Society.js";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

export const societySignup = async (req, res) => {
  try {
    const { societyName, societyType, collegeName, coordinatorName, email, password, repassword } =
      req.body;

    if (password !== repassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const existingSociety = await Society.findOne({ email });
    if (existingSociety) {
      return res.status(400).json({ message: "Society already exists" });
    }

    const generateSocietyId = (societyName, collegeName) => {
      const cleanSociety = societyName.replace(/\s+/g, "").toLowerCase();
      const initials = collegeName
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase();
      return `${cleanSociety}_${initials}`;
    };

    const societyId = generateSocietyId(societyName, collegeName);

    const existingId = await Society.findOne({ societyId });
    if (existingId) {
      return res.status(400).json({ message: "Society ID already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const society = new Society({
      societyName,
      societyId,
      societyType,
      collegeName,
      coordinatorName: coordinatorName || "",
      email,
      password: hashedPassword,
    });

    await society.save();

    res.status(201).json({
      success: true,
      message: "Society registered successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET SOCIETY PROFILE
export const getSocietyPublicProfile = async (req, res) => {
  try {
    const society = await Society.findOne({ societyId: req.params.societyId })
      .select("societyName collegeName societyType coordinatorName committee profilePic bio societyId")
      .populate("committee.studentId", "name profilePic userId");

    if (!society) {
      return res.status(404).json({ success: false, message: "Society not found" });
    }

    res.status(200).json({ success: true, data: society });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getSocietyProfile = async (req, res) => {
  try {
    const society = await Society.findById(req.params.id)
      .select("societyName collegeName societyType coordinatorName committee profilePic bio")
      .populate("committee.studentId", "name profilePic userId");

    if (!society) {
      return res
        .status(404)
        .json({ success: false, message: "Society not found" });
    }

    res.status(200).json({ success: true, data: society });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateSocietyProfile = async (req, res) => {
  try {
    const society = await Society.findById(req.params.id);

    if (!society) {
      return res.status(404).json({ message: "Society not found" });
    }

    // BIO update
    if (req.body.bio !== undefined) {
      society.bio = req.body.bio;
    }

    // ✅ PROFILE PIC — Cloudinary URL directly
    if (req.file) {
      society.profilePic = req.file.path;  // 🔥 Cloudinary URL saved in DB
    }

    await society.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: society,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const removeCommitteeMember = async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({ success: false, message: "Student ID required" });
    }

    const society = await Society.findById(req.params.id);
    if (!society) {
      return res.status(404).json({ success: false, message: "Society not found" });
    }

    const before = society.committee.length;
    society.committee = society.committee.filter(
      (member) => member.studentId && member.studentId.toString() !== studentId
    );

    if (society.committee.length === before) {
      return res.status(404).json({ success: false, message: "Member not found in committee" });
    }

    await society.save();

    const updatedSociety = await Society.findById(req.params.id).populate(
      "committee.studentId",
      "name userId profilePic"
    );

    res.status(200).json({ success: true, data: updatedSociety });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const addCommitteeMember = async (req, res) => {
  try {
    const { studentId, post } = req.body;

    if (!studentId || !post) {
      return res
        .status(400)
        .json({ success: false, message: "Student ID and Post are required" });
    }

    const society = await Society.findById(req.params.id);
    if (!society) {
      return res
        .status(404)
        .json({ success: false, message: "Society not found" });
    }

    const studentExists = await mongoose.model("Student").findById(studentId);
    if (!studentExists) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const alreadyMember = society.committee.find(
      (member) =>
        member.studentId && member.studentId.toString() === studentId
    );

    if (alreadyMember) {
      return res
        .status(400)
        .json({ success: false, message: "Student already in committee" });
    }

    society.committee.push({ studentId, post });
    await society.save();

    const updatedSociety = await Society.findById(req.params.id).populate(
      "committee.studentId",
      "name userId"
    );

    res.status(200).json({ success: true, data: updatedSociety });
  } catch (error) {
    console.log("ADD COMMITTEE ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
