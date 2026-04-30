import Comment from "../models/Comment.js";
import Post from "../models/Post.js";
import Student from "../models/Student.js";
import Society from "../models/Society.js";
import Notification from "../models/Notification.js";
import { getIO } from "../socket/ioInstance.js";
import { sendNotification } from "../socket/socket.js";

// Helper: get actor info (student or society)
const getActorInfo = async (userId) => {
  // Student: check by _id (MongoDB ObjectId) first, then by userId field
  let student = null;
  try {
    student = await Student.findById(userId).select("name profilePic");
  } catch (_) {}
  if (!student)
    student = await Student.findOne({ userId }).select("name profilePic");
  if (student)
    return {
      name: student.name,
      profilePic: student.profilePic || "",
      role: "student",
    };

  // Society: check by societyId field
  const society = await Society.findOne({ societyId: userId }).select(
    "societyName profilePic",
  );
  if (society)
    return {
      name: society.societyName,
      profilePic: society.profilePic || "",
      role: "society",
    };

  return { name: "Someone", profilePic: "", role: "" };
};

// POST /api/comment/add
export const addComment = async (req, res) => {
  try {
    const { postId, userId, userName, userRole, text } = req.body;

    if (!postId || !userId || !text?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "postId, userId, text are required" });
    }

    await Comment.create({
      postId,
      userId,
      userName: userName || "User",
      userRole: userRole || "student",
      text: text.trim(),
    });

    const comments = await Comment.find({ postId }).sort({ createdAt: -1 });

    // 🔔 Send notification to post owner (only if commenter ≠ owner)
    try {
      const post = await Post.findById(postId);
      if (post && post.societyId !== userId) {
        const actor = await getActorInfo(userId);
        const preview =
          text.trim().slice(0, 50) + (text.trim().length > 50 ? "…" : "");
        const notification = await Notification.create({
          recipientId: post.societyId,
          recipientType: "society",
          type: "comment",
          actorId: userId,
          actorName: actor.name,
          actorProfilePic: actor.profilePic,
          actorRole: actor.role || "",
          postId: post._id,
          postImage: post.image || "",
          societyName: post.societyName,
          message: `${actor.name} commented: "${preview}"`,
        });
        // Real-time push
        try {
          const io = getIO();
          sendNotification(io, post.societyId, notification);
        } catch (_) {}
      }
    } catch (notifErr) {
      console.warn("Comment notification error (non-fatal):", notifErr.message);
    }

    res.json({ success: true, comments, count: comments.length });
  } catch (err) {
    console.error("addComment error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/comment/:postId
export const getComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const comments = await Comment.find({ postId }).sort({ createdAt: -1 });
    res.json({ success: true, comments, count: comments.length });
  } catch (err) {
    console.error("getComments error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
