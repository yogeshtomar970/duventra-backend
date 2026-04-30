import express from "express";
import { joinSociety, unjoinSociety, checkJoined, getMembers, getFollowing, getSuggestions } from "../controllers/joinController.js";

const router = express.Router();

router.post("/join", joinSociety);
router.post("/unjoin", unjoinSociety);
router.get("/check/:myId/:targetId", checkJoined);
router.get("/members/:societyId", getMembers);
router.get("/following/:societyId", getFollowing);
router.get("/suggestions/:societyId", getSuggestions);

export default router;
