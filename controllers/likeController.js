import Like from "../models/Like.js";
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

// POST /api/like/toggle  — body: { userId, postId }
export const toggleLike = async (req, res) => {
  try {
    const { userId, postId } = req.body;

    if (!userId || !postId) {
      return res
        .status(400)
        .json({ message: "userId and postId are required" });
    }

    const existing = await Like.findOne({ userId, postId });

    if (existing) {
      await existing.deleteOne();
      const count = await Like.countDocuments({ postId });
      return res.json({ liked: false, count });
    }

    await new Like({ userId, postId }).save();
    const count = await Like.countDocuments({ postId });

    // 🔔 Send notification to post owner (only if liker ≠ owner)
    try {
      const post = await Post.findById(postId);
      if (post && post.societyId !== userId) {
        const actor = await getActorInfo(userId);
        const notification = await Notification.create({
          recipientId: post.societyId,
          recipientType: "society",
          type: "like",
          actorId: userId,
          actorName: actor.name,
          actorProfilePic: actor.profilePic,
          actorRole: actor.role || "",
          postId: post._id,
          postImage: post.image || "",
          societyName: post.societyName,
          message: `${actor.name} liked your post`,
        });
        // Real-time push
        try {
          const io = getIO();
          sendNotification(io, post.societyId, notification);
        } catch (_) {}
      }
    } catch (notifErr) {
      console.warn("Like notification error (non-fatal):", notifErr.message);
    }

    res.json({ liked: true, count });
  } catch (error) {
    console.error("toggleLike error:", error.message);
    res.status(500).json({ message: "Error toggling like" });
  }
};

// GET /api/like/:postId/:userId
export const getLikes = async (req, res) => {
  try {
    const { postId, userId } = req.params;
    const count = await Like.countDocuments({ postId });
    const exists = await Like.findOne({ postId, userId });
    res.json({ success: true, count, liked: !!exists });
  } catch (error) {
    console.error("getLikes error:", error.message);
    res.status(500).json({ message: "Error fetching likes" });
  }
};
