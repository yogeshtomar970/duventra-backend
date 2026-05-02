import News from "../models/News.js";
import NewsComment from "../models/NewsComment.js";
import NewsLike from "../models/NewsLike.js";
import Student from "../models/Student.js";
import Society from "../models/Society.js";
import Notification from "../models/Notification.js";
import { getIO } from "../socket/ioInstance.js";
import { sendNotification } from "../socket/socket.js";
import { v2 as cloudinary } from "cloudinary";

// Helper: get actor info (who liked/commented)
const getActorInfo = async (userId) => {
  // Try MongoDB _id first (students send user.id = _id)
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

  // Society: try by societyId field
  const society = await Society.findOne({ societyId: userId }).select(
    "societyName profilePic",
  );
  if (society)
    return {
      name: society.societyName,
      profilePic: society.profilePic || "",
      role: "society",
    };

  // Society: try by MongoDB _id
  try {
    const societyById = await Society.findById(userId).select(
      "societyName profilePic societyId",
    );
    if (societyById)
      return {
        name: societyById.societyName,
        profilePic: societyById.profilePic || "",
        role: "society",
      };
  } catch (_) {}

  return { name: "Someone", profilePic: "", role: "" };
};

// Helper: get recipientId that matches what Notification.jsx uses to fetch
// Society uses societyId (custom string), Student uses MongoDB _id
const getRecipientId = async (mongoId, uploadedBy) => {
  if (uploadedBy === "society") {
    const society = await Society.findById(mongoId).select("societyId");
    if (society?.societyId) return society.societyId; // custom societyId string
  }
  return mongoId.toString(); // student: MongoDB _id
};

// POST /api/news/upload
export const uploadNewsController = async (req, res) => {
  try {
    const { description, uploadedBy, userId } = req.body;
    if (!description)
      return res.status(400).json({ message: "Description required" });
    if (!uploadedBy || !userId)
      return res
        .status(400)
        .json({ message: "uploadedBy and userId required" });

    const imageUrl = req.file ? req.file.path : null;
    const news = new News({ description, image: imageUrl, uploadedBy, userId });
    await news.save();
    res.status(201).json({ message: "News uploaded successfully", news });
  } catch (error) {
    res.status(500).json({ message: "Upload failed", error: error.message });
  }
};

// GET /api/news/all
export const getAllNews = async (req, res) => {
  try {
    const newsList = await News.find().sort({ createdAt: -1 });

    const enriched = await Promise.all(
      newsList.map(async (item) => {
        let userName = "Unknown",
          userImage = null,
          recipientId = null;

        if (item.uploadedBy === "student") {
          const student = await Student.findById(item.userId);
          if (student) {
            userName = student.name;
            userImage = student.profilePic || null;
            recipientId = student.userId; // custom userId for /student-profile?id=
          }
        }
        if (item.uploadedBy === "society") {
          const society = await Society.findById(item.userId);
          if (society) {
            userName = society.societyName;
            userImage = society.profilePic || null;
            recipientId = society.societyId; // custom societyId for /society-profile?id=
          }
        }

        const likeCount = await NewsLike.countDocuments({ newsId: item._id });
        const commentCount = await NewsComment.countDocuments({
          newsId: item._id,
        });

        return { ...item._doc, userName, userImage, recipientId, likeCount, commentCount };
      }),
    );

    res.status(200).json(enriched);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch news" });
  }
};

// DELETE /api/news/:id  — body: { userId }
export const deleteNews = async (req, res) => {
  try {
    const { userId } = req.body;
    const news = await News.findById(req.params.id);
    if (!news)
      return res
        .status(404)
        .json({ success: false, message: "News not found" });

    // Ownership check
    if (news.userId.toString() !== userId) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Unauthorized: Yeh news aapki nahi hai",
        });
    }

    // Cloudinary se image delete karo
    if (news.image) {
      try {
        const urlParts = news.image.split("/");
        const folderIndex = urlParts.indexOf("duventra");
        if (folderIndex !== -1) {
          const publicId = urlParts
            .slice(folderIndex)
            .join("/")
            .replace(/\.[^/.]+$/, "");
          await cloudinary.uploader.destroy(publicId);
        }
      } catch (e) {
        console.log("Cloudinary delete error (non-fatal):", e.message);
      }
    }

    await News.findByIdAndDelete(req.params.id);
    await NewsLike.deleteMany({ newsId: req.params.id });
    await NewsComment.deleteMany({ newsId: req.params.id });

    res.json({ success: true, message: "News deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ✅ NEW: PUT /api/news/update/:id  — description aur optionally new image
export const updateNews = async (req, res) => {
  try {
    const { userId, description } = req.body;
    const news = await News.findById(req.params.id);
    if (!news)
      return res
        .status(404)
        .json({ success: false, message: "News not found" });

    if (news.userId.toString() !== userId) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Unauthorized: Yeh news aapki nahi hai",
        });
    }

    if (description !== undefined) news.description = description;

    // Agar naya image upload kiya toh purana Cloudinary se hatao
    if (req.file) {
      if (news.image) {
        try {
          const urlParts = news.image.split("/");
          const folderIndex = urlParts.indexOf("duventra");
          if (folderIndex !== -1) {
            const publicId = urlParts
              .slice(folderIndex)
              .join("/")
              .replace(/\.[^/.]+$/, "");
            await cloudinary.uploader.destroy(publicId);
          }
        } catch (e) {
          console.log("Cloudinary old image delete (non-fatal):", e.message);
        }
      }
      news.image = req.file.path;
    }

    await news.save();
    res
      .status(200)
      .json({ success: true, message: "News updated successfully", news });
  } catch (error) {
    console.log("Update News Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// POST /api/news/like/toggle
export const toggleNewsLike = async (req, res) => {
  try {
    const { newsId, userId } = req.body;
    if (!newsId || !userId)
      return res.status(400).json({ message: "newsId and userId required" });

    const existing = await NewsLike.findOne({ newsId, userId });
    if (existing) {
      await existing.deleteOne();
      const count = await NewsLike.countDocuments({ newsId });
      return res.json({ liked: false, count });
    }
    await new NewsLike({ newsId, userId }).save();
    const count = await NewsLike.countDocuments({ newsId });

    // 🔔 Notification to news owner (only if liker ≠ owner)
    try {
      const news = await News.findById(newsId);
      if (news && news.userId.toString() !== userId) {
        const actor = await getActorInfo(userId);
        // recipientId: societyId for societies, _id for students (matches Notification.jsx fetch)
        const recipientId = await getRecipientId(news.userId, news.uploadedBy);
        const recipientType =
          news.uploadedBy === "society" ? "society" : "student";

        const notification = await Notification.create({
          recipientId,
          recipientType,
          type: "like",
          actorId: userId,
          actorName: actor.name,
          actorProfilePic: actor.profilePic,
          actorRole: actor.role,
          postId: news._id,
          postImage: news.image || "",
          sourceType: "news",
          message: `${actor.name} liked your news`,
        });

        try {
          sendNotification(getIO(), recipientId, notification);
        } catch (_) {}
      }
    } catch (notifErr) {
      console.warn(
        "NewsLike notification error (non-fatal):",
        notifErr.message,
      );
    }

    res.json({ liked: true, count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/news/like/:newsId/:userId
export const getNewsLikes = async (req, res) => {
  try {
    const { newsId, userId } = req.params;
    const count = await NewsLike.countDocuments({ newsId });
    const exists = await NewsLike.findOne({ newsId, userId });
    res.json({ count, liked: !!exists });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/news/comment/add
export const addNewsComment = async (req, res) => {
  try {
    const { newsId, userId, text } = req.body;
    if (!newsId || !userId || !text?.trim())
      return res
        .status(400)
        .json({ success: false, message: "newsId, userId, text required" });

    await NewsComment.create({ newsId, userId, text: text.trim() });
    const comments = await NewsComment.find({ newsId }).sort({ createdAt: -1 });

    // 🔔 Notification to news owner (only if commenter ≠ owner)
    try {
      const news = await News.findById(newsId);
      if (news && news.userId.toString() !== userId) {
        const actor = await getActorInfo(userId);
        const recipientId = await getRecipientId(news.userId, news.uploadedBy);
        const recipientType =
          news.uploadedBy === "society" ? "society" : "student";
        const preview =
          text.trim().slice(0, 50) + (text.trim().length > 50 ? "…" : "");

        const notification = await Notification.create({
          recipientId,
          recipientType,
          type: "comment",
          actorId: userId,
          actorName: actor.name,
          actorProfilePic: actor.profilePic,
          actorRole: actor.role,
          postId: news._id,
          postImage: news.image || "",
          sourceType: "news",
          message: `${actor.name} commented your news: "${preview}"`,
        });

        try {
          sendNotification(getIO(), recipientId, notification);
        } catch (_) {}
      }
    } catch (notifErr) {
      console.warn(
        "NewsComment notification error (non-fatal):",
        notifErr.message,
      );
    }

    res.json({ success: true, comments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/news/comment/:newsId
export const getNewsComments = async (req, res) => {
  try {
    const comments = await NewsComment.find({ newsId: req.params.newsId }).sort(
      { createdAt: -1 },
    );
    res.json({ success: true, comments, count: comments.length });
  } catch (error) {
    res.status(500).json({ success: false });
  }
};
