import express from "express";
import { uploadNews } from "../middlewares/upload.js";
import {
  uploadNewsController,
  getAllNews,
  deleteNews,
  updateNews,
  toggleNewsLike,
  getNewsLikes,
  addNewsComment,
  getNewsComments,
} from "../controllers/newsController.js";

const router = express.Router();

// News CRUD
router.post("/upload",          uploadNews.single("image"), uploadNewsController);
router.get("/all",              getAllNews);
router.delete("/:id",           deleteNews);
router.put("/update/:id",       uploadNews.single("image"), updateNews);  // ✅ NEW

// Likes
router.post("/like/toggle",           toggleNewsLike);
router.get("/like/:newsId/:userId",   getNewsLikes);

// Comments
router.post("/comment/add",           addNewsComment);
router.get("/comment/:newsId",        getNewsComments);

export default router;
