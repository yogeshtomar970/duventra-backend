import express from "express";
import { toggleLike, getLikes } from "../controllers/likeController.js";

const router = express.Router();

router.post("/toggle", toggleLike);
router.get("/:postId/:userId", getLikes);   // changed from /:postId/:societyId

export default router;
