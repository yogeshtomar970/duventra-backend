// controllers/placementController.js
import Placement from "../models/placementModel.js";
import PlacementApplication from "../models/placementApplicationModel.js";

// ── GET all jobs ──────────────────────────────────────
export const getAllJobs = async (req, res) => {
  try {
    const jobs = await Placement.find().sort({ createdAt: -1 });
    res.json({ success: true, data: jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST create job (society admin only) ──────────────
export const createJob = async (req, res) => {
  try {
    const { title, jobType, location, description, societyId, societyName, societyPic, customFields } = req.body;
    if (!title || !jobType || !description || !societyId) {
      return res.status(400).json({ success: false, message: "Required fields missing" });
    }
    const job = await Placement.create({ title, jobType, location, description, societyId, societyName, societyPic, customFields: customFields || [] });
    res.json({ success: true, data: job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE job ────────────────────────────────────────
export const deleteJob = async (req, res) => {
  try {
    const { id, societyId } = req.params;
    const job = await Placement.findById(id);
    if (!job) return res.status(404).json({ success: false, message: "Job not found" });
    
    // Sirf jo society ne post kiya wahi delete kar sakti hai
    if (job.societyId !== societyId) {
      return res.status(403).json({ success: false, message: "Aap is job ko delete nahi kar sakte" });
    }
    
    await job.deleteOne();
    res.json({ success: true, message: "Job deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── POST apply ────────────────────────────────────────
export const applyJob = async (req, res) => {
  try {
    const { jobId, userId, userName, userEmail, responses } = req.body;
    // Check duplicate
    const exists = await PlacementApplication.findOne({ jobId, userId });
    if (exists) return res.status(400).json({ success: false, message: "Already applied" });
    const app = await PlacementApplication.create({ jobId, userId, userName, userEmail, responses });
    res.json({ success: true, data: app });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET my applied jobs ───────────────────────────────
export const getApplied = async (req, res) => {
  try {
    const apps = await PlacementApplication.find({ userId: req.params.userId });
    res.json({ success: true, data: apps });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET applications for a job (admin) ───────────────
export const getJobApplications = async (req, res) => {
  try {
    const apps = await PlacementApplication.find({ jobId: req.params.jobId });
    res.json({ success: true, data: apps });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
