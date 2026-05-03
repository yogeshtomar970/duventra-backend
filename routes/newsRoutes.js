// ============================================================
// newsRoutes.js — FIXED
// ============================================================
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
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

router.get("/all", getAllNews);                                                              // ✅ public
router.get("/like/:newsId/:userId", getNewsLikes);                                          // ✅ public
router.get("/comment/:newsId", getNewsComments);                                            // ✅ public

router.post("/upload", verifyToken, uploadNews.single("image"), uploadNewsController);      // 🔒
router.delete("/:id", verifyToken, deleteNews);                                             // 🔒
router.put("/update/:id", verifyToken, uploadNews.single("image"), updateNews);             // 🔒
router.post("/like/toggle", verifyToken, toggleNewsLike);                                   // 🔒
router.post("/comment/add", verifyToken, addNewsComment);                                   // 🔒

export default router;
