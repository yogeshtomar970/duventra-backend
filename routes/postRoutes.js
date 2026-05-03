// ============================================================
// postRoutes.js — FIXED
// ============================================================
import express from "express";
import { uploadPost } from "../middlewares/upload.js";
import { uploadPosts, getAllPosts, increaseViews, updatePost, deletePost } from "../controllers/postController.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

router.get("/all", getAllPosts);                                       // ✅ public — anyone can view feed
router.put("/view/:postId", increaseViews);                           // ✅ public — just a view counter

router.post("/upload", verifyToken, uploadPost.single("file"), uploadPosts);   // 🔒 login required
router.put("/update/:postId", verifyToken, updatePost);               // 🔒 login required
router.delete("/delete/:postId", verifyToken, deletePost);            // 🔒 login required

export default router;
