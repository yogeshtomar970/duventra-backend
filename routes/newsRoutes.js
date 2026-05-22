import express from "express";
import { protect } from "../middlewares/auth.js";
import { uploadNews } from "../middlewares/upload.js";
import {
  uploadNewsController,
  getAllNews,
  deleteNews,
  updateNews,
  toggleNewsLike,
  getNewsLikes,
  addNewsComment,
  getNewsComments,  getUserNews,
} from "../controllers/newsController.js";

const router = express.Router();

// News CRUD
router.post("/upload",protect, uploadNews.single("image"), uploadNewsController);
router.get("/all", getAllNews);
router.delete("/:id", protect, deleteNews);
router.put("/update/:id",protect, uploadNews.single("image"), updateNews); // ✅ NEW

// Likes
router.post("/like/toggle", toggleNewsLike);
router.get("/like/:newsId/:userId", getNewsLikes);

// Comments
router.post("/comment/add", addNewsComment);
router.get("/comment/:newsId", getNewsComments);
router.get("/user/:userId", getUserNews); 
export default router;
