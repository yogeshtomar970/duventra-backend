import Post from "../models/Post.js";
import Society from "../models/Society.js";
import { v2 as cloudinary } from "cloudinary";

export const uploadPosts = async (req, res) => {
  try {
    const { description, formLink, societyId, eventTypes, startDate, lastDate } =
      req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }

    const society = await Society.findById(societyId);

    if (!society) {
      return res.status(404).json({
        success: false,
        message: "Society not found",
      });
    }

    let parsedEventTypes = [];
    if (eventTypes) {
      parsedEventTypes = JSON.parse(eventTypes);
    }

    // lastDate aane ke baad start se pehle ka na ho, yeh sanity check
    if (startDate && lastDate && new Date(lastDate) < new Date(startDate)) {
      return res.status(400).json({
        success: false,
        message: "Last date, start date se pehle nahi ho sakti",
      });
    }

    const imageUrl = req.file.path;

    const newPost = new Post({
      image: imageUrl,
      description,
      formLink,
      eventTypes: parsedEventTypes,
      societyName: society.societyName,
      societyType: society.societyType,
      collegeName: society.collegeName,
      societyId: society.societyId,
      startDate: startDate || null,
      lastDate: lastDate || null,
    });

    await newPost.save();

    res.status(201).json({
      success: true,
      message: "Post uploaded successfully",
      post: newPost,
    });
  } catch (error) {
    console.log("Upload Post Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const getAllPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const upcomingOnly = req.query.upcoming === "true";

    // Sirf woh posts jinki lastDate abhi tak nahi aayi (ya lastDate set hi nahi)
    const query = upcomingOnly
      ? { lastDate: { $gte: new Date() } }
      : {};

    const [total, posts] = await Promise.all([
      Post.countDocuments(query),
      Post.find(query)
        .select("-viewedBy") // ← viewedBy array exclude — biggest perf win
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Sabhi societyIds ek saath nikalo, ek hi query mein profilePic fetch karo
    const societyIds = [...new Set(posts.map((p) => p.societyId))];
    const societies = await Society.find({
      societyId: { $in: societyIds },
    }).select("societyId profilePic").lean();

    const profilePicMap = {};
    societies.forEach((s) => {
      profilePicMap[s.societyId] = s.profilePic || "";
    });

    const postsWithProfile = posts.map((post) => ({
      ...post,
      profilePic: profilePicMap[post.societyId] || "",
    }));

    res.status(200).json({
      success: true,
      posts: postsWithProfile,
      hasMore: page * limit < total, // ← frontend ko batata h aur posts hain ya nahi
    });
  } catch (error) {
    console.log("Fetch Post Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
export const increaseViews = async (req, res) => {
  try {
    const { postId } = req.params;

    // Viewer ki unique identity: userId (agar logged in) ya IP address
    const userId = req.query.userId || null;
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      "unknown";

    const viewerKey = userId ? `user_${userId}` : `ip_${ip}`;

    const post = await Post.findById(postId);
    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    // Agar pehle se dekha hua hai to count mat badhao
    if (post.viewedBy.includes(viewerKey)) {
      return res.json({
        success: true,
        views: post.views,
        alreadyViewed: true,
      });
    }

    // Naya viewer — count badhao aur record karo
    post.views += 1;
    post.viewedBy.push(viewerKey);
    await post.save();

    res.json({ success: true, views: post.views, alreadyViewed: false });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ NEW: Post Update API
export const updatePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { description, formLink, societyId } = req.body;

    const post = await Post.findById(postId);

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    if (post.societyId !== societyId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Yeh post aapki nahi hai",
      });
    }

    if (description !== undefined) post.description = description;
    if (formLink !== undefined) post.formLink = formLink;

    await post.save();

    res.status(200).json({
      success: true,
      message: "Post updated successfully",
      post,
    });
  } catch (error) {
    console.log("Update Post Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
export const getPostById = async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    const society = await Society.findOne({ societyName: post.societyName });
    const postWithProfile = {
      ...post._doc,
      profilePic: society?.profilePic || "",
    };

    res.status(200).json({ success: true, post: postWithProfile });
  } catch (error) {
    console.log("Get Post By ID Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
// ✅ NEW: Post Delete API
export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const { societyId } = req.body;

    const post = await Post.findById(postId);

    if (!post) {
      return res
        .status(404)
        .json({ success: false, message: "Post not found" });
    }

    if (post.societyId !== societyId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Yeh post aapki nahi hai",
      });
    }

    // Cloudinary se image bhi delete karo
    if (post.image) {
      try {
        const urlParts = post.image.split("/");
        const folderIndex = urlParts.indexOf("duventra");
        if (folderIndex !== -1) {
          const publicId = urlParts
            .slice(folderIndex)
            .join("/")
            .replace(/\.[^/.]+$/, "");
          await cloudinary.uploader.destroy(publicId);
        }
      } catch (cloudErr) {
        console.log("Cloudinary delete error (non-fatal):", cloudErr.message);
      }
    }

    await Post.findByIdAndDelete(postId);

    res
      .status(200)
      .json({ success: true, message: "Post deleted successfully" });
  } catch (error) {
    console.log("Delete Post Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};