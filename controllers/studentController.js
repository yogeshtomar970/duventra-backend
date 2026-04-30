import Student from "../models/Student.js";
import Society from "../models/Society.js";
import bcrypt from "bcryptjs";
import Notification from "../models/Notification.js";
import { getIO } from "../socket/ioInstance.js";
import { sendNotification } from "../socket/socket.js";

export const studentSignup = async (req, res) => {
  try {
    const { name, rollNo, course, collegeName, email, year, password, repassword } =
      req.body;

    const generateUserId = (name, collegeName, rollNo) => {
      const nameInitials = name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase();

      const collegeInitials = collegeName
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase();

      return `${nameInitials}_${collegeInitials}_${rollNo}`;
    };

    if (password !== repassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({ message: "Student already exists" });
    }

    const userId = generateUserId(name, collegeName, rollNo);
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ req.file.path = Cloudinary secure URL for ID card
    const idCardUrl = req.file ? req.file.path : "";

    const student = new Student({
      userId,
      name,
      rollNo,
      course,
      collegeName,
      email,
      year,
      password: hashedPassword,
      idCard: idCardUrl,  // 🔥 Cloudinary URL saved in DB
    });

    await student.save();

    res.status(201).json({
      success: true,
      message: "Student registered successfully",
      userId,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getStudentProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).select(
      "name userId collegeName course year profilePic"
    );

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.status(200).json({ success: true, student });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getStudentByUserId = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.params.id });

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    res.status(200).json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const searchStudentByName = async (req, res) => {
  try {
    const { name } = req.query;
    if (!name || name.trim().length < 2) {
      return res.status(400).json({ success: false, message: "Name must be at least 2 characters" });
    }

    const students = await Student.find({
      name: { $regex: name.trim(), $options: "i" },
    }).select("_id name userId collegeName profilePic");

    res.status(200).json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStudentSuggestions = async (req, res) => {
  try {
    const StudentFollow = (await import("../models/StudentFollow.js")).default;
    const { studentId } = req.params; // can be student _id OR society societyId

    // Already followed students
    const follows = await StudentFollow.find({ followedBy: studentId });
    const followedIds = follows.map(f => f.followedTo);
    followedIds.push(studentId); // exclude self (in case studentId is a student _id)

    const suggestions = await Student.find({
      _id: { $nin: followedIds },
    }).select("name userId collegeName course year profilePic _id").limit(20);

    res.status(200).json({ success: true, data: suggestions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const followStudent = async (req, res) => {
  try {
    const StudentFollow = (await import("../models/StudentFollow.js")).default;
    const { myId, targetId, followerType } = req.body; // followerType = "student" | "society"

    if (myId === targetId) return res.status(400).json({ message: "Can't follow yourself" });

    const already = await StudentFollow.findOne({ followedBy: myId, followedTo: targetId });
    if (already) return res.json({ followed: true });

    await new StudentFollow({
      followedBy: myId,
      followedTo: targetId,
      followerType: followerType || "student",
    }).save();

    // 🔔 Notification: student ko batao ki koi unhe join kar raha hai
    try {
      let actorName = "Someone";
      let actorProfilePic = "";
      let actorRole = followerType || "student";

      if (actorRole === "society") {
        // myId = societyId string
        const society = await Society.findOne({ societyId: myId }).select("societyName profilePic");
        if (society) {
          actorName = society.societyName;
          actorProfilePic = society.profilePic || "";
        }
      } else {
        // myId = student MongoDB _id
        let student = null;
        try { student = await Student.findById(myId).select("name profilePic"); } catch (_) {}
        if (!student) student = await Student.findOne({ userId: myId }).select("name profilePic");
        if (student) {
          actorName = student.name;
          actorProfilePic = student.profilePic || "";
        }
      }

      const notification = await Notification.create({
        recipientId:     targetId,   // student ka MongoDB _id
        recipientType:   "student",
        type:            "join",
        actorId:         myId,
        actorName,
        actorProfilePic,
        actorRole,
        message:         `${actorName} joined you`,
      });

      // Real-time push
      try {
        const io = getIO();
        sendNotification(io, targetId, notification);
      } catch (_) {}
    } catch (notifErr) {
      console.warn("Follow notification error (non-fatal):", notifErr.message);
    }

    res.json({ followed: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const unfollowStudent = async (req, res) => {
  try {
    const StudentFollow = (await import("../models/StudentFollow.js")).default;
    const { myId, targetId } = req.body;
    await StudentFollow.findOneAndDelete({ followedBy: myId, followedTo: targetId });
    res.json({ followed: false });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStudentFollowing = async (req, res) => {
  try {
    const StudentFollow = (await import("../models/StudentFollow.js")).default;
    const { studentId } = req.params;
    const follows = await StudentFollow.find({ followedBy: studentId });
    const targetIds = follows.map(f => f.followedTo);
    const students = await Student.find({ _id: { $in: targetIds } })
      .select("name userId collegeName course year profilePic _id");
    res.json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStudentMembers = async (req, res) => {
  try {
    const StudentFollow = (await import("../models/StudentFollow.js")).default;
    const Society = (await import("../models/Society.js")).default;
    const { studentId } = req.params;

    const follows = await StudentFollow.find({ followedTo: studentId });

    // Separate student followers and society followers
    const studentFollowerIds = follows
      .filter(f => f.followerType === "student" || !f.followerType)
      .map(f => f.followedBy);

    const societyFollowerIds = follows
      .filter(f => f.followerType === "society")
      .map(f => f.followedBy);

    // Fetch student members
    const studentMembers = await Student.find({ _id: { $in: studentFollowerIds } })
      .select("name userId collegeName course year profilePic _id");

    // Fetch society members
    const societyMembers = await Society.find({ societyId: { $in: societyFollowerIds } })
      .select("societyName collegeName societyType profilePic societyId");

    // Tag them so frontend can render correctly
    const tagged = [
      ...studentMembers.map(s => ({ ...s.toObject(), memberType: "student" })),
      ...societyMembers.map(s => ({ ...s.toObject(), memberType: "society" })),
    ];

    res.json({ success: true, data: tagged });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateStudentProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    if (req.file) {
      student.profilePic = req.file.path;
    }

    // ✅ NEW: collegeName aur year bhi update kar sakte hain
    if (req.body.collegeName) student.collegeName = req.body.collegeName;
    if (req.body.year)        student.year        = req.body.year;

    await student.save();

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      student,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getStudentPublicProfile = async (req, res) => {
  try {
    const student = await Student.findOne({ userId: req.params.userId })
      .select("name userId collegeName course year profilePic");

    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found" });
    }

    res.status(200).json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const checkStudentFollow = async (req, res) => {
  try {
    const StudentFollow = (await import("../models/StudentFollow.js")).default;
    const { followerId, studentId } = req.params;
    const exists = await StudentFollow.findOne({ followedBy: followerId, followedTo: studentId });
    res.json({ followed: !!exists });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
