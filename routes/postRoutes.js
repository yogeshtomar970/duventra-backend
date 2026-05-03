import express from "express";
import { uploadPost } from "../middlewares/upload.js";
import { uploadPosts, getAllPosts, increaseViews, updatePost, deletePost } from "../controllers/postController.js";

const router = express.Router();

router.post("/upload", uploadPost.single("file"), uploadPosts);
router.get("/all", getAllPosts);
router.put("/view/:postId", increaseViews);

// ✅ NEW Routes
router.put("/update/:postId", updatePost);      // POST update (description, formLink)
router.delete("/delete/:postId", deletePost);   // POST delete

export default router;
