import express from "express";
import { protect } from "../middlewares/auth.js";
import { uploadPost } from "../middlewares/upload.js";
import { uploadPosts, getAllPosts, increaseViews, updatePost, deletePost, getPostById } from "../controllers/postController.js";

const router = express.Router();

router.post("/upload",protect, uploadPost.single("file"), uploadPosts);
router.get("/all", getAllPosts);
router.get("/:postId", getPostById);  
router.put("/view/:postId", increaseViews);

// ✅ NEW Routes
router.put("/update/:postId",protect, updatePost);      // POST update (description, formLink)
router.delete("/delete/:postId",protect, deletePost);   // POST delete

export default router;
