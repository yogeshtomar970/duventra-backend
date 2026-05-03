// ============================================================
// joinRoutes.js — FIXED
// ============================================================
import express from "express";
import { joinSociety, unjoinSociety, checkJoined, getMembers, getFollowing, getSuggestions } from "../controllers/joinController.js";
import { verifyToken } from "../middlewares/auth.js";

const router = express.Router();

router.get("/check/:myId/:targetId", checkJoined);      // ✅ public
router.get("/members/:societyId", getMembers);           // ✅ public

router.post("/join", verifyToken, joinSociety);          // 🔒
router.post("/unjoin", verifyToken, unjoinSociety);      // 🔒
router.get("/following/:societyId", verifyToken, getFollowing);    // 🔒
router.get("/suggestions/:societyId", verifyToken, getSuggestions); // 🔒

export default router;
