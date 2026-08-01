// controllers/placementController.js
import Placement from "../models/placementModel.js";
import PlacementApplication from "../models/placementApplicationModel.js";
import Society from "../models/Society.js";
import Student from "../models/Student.js";

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
    if (req.user.role !== "society") {
      return res
        .status(403)
        .json({ success: false, message: "Only societies can post jobs" });
    }

    // ✅ FIX: society identity ab JWT (req.user.id) se aati hai, body se nahi —
    // pehle koi bhi society kisi aur society ke naam par job post kar sakti thi
    const society = await Society.findById(req.user.id).select(
      "societyId societyName profilePic",
    );
    if (!society) {
      return res
        .status(404)
        .json({ success: false, message: "Society not found" });
    }

    const { title, jobType, location, description, customFields } = req.body;
    if (!title || !jobType || !description) {
      return res
        .status(400)
        .json({ success: false, message: "Required fields missing" });
    }
    const job = await Placement.create({
      title,
      jobType,
      location,
      description,
      societyId: society.societyId,
      societyName: society.societyName,
      societyPic: society.profilePic || "",
      customFields: customFields || [],
    });
    res.json({ success: true, data: job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── DELETE job ────────────────────────────────────────
export const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await Placement.findById(id);
    if (!job)
      return res.status(404).json({ success: false, message: "Job not found" });

    // ✅ FIX: sirf JWT se authenticated society, jisne asal me job post kiya
    // tha, wahi delete kar sakti hai — params ke societyId par bharosa nahi
    if (req.user.role !== "society") {
      return res.status(403).json({
        success: false,
        message: "Aap is job ko delete nahi kar sakte",
      });
    }
    const society = await Society.findById(req.user.id).select("societyId");
    if (!society || job.societyId !== society.societyId) {
      return res.status(403).json({
        success: false,
        message: "Aap is job ko delete nahi kar sakte",
      });
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
    if (req.user.role !== "student") {
      return res
        .status(403)
        .json({ success: false, message: "Only students can apply" });
    }

    // ✅ FIX: applicant identity ab JWT (req.user.id) se aati hai, body se
    // nahi — pehle koi bhi student kisi aur student ke naam/email se apply
    // kar sakta tha
    const student = await Student.findById(req.user.id).select("name email");
    if (!student) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    const { jobId, responses } = req.body;
    const userId = req.user.id;

    const exists = await PlacementApplication.findOne({ jobId, userId });
    if (exists)
      return res
        .status(400)
        .json({ success: false, message: "Already applied" });
    const app = await PlacementApplication.create({
      jobId,
      userId,
      userName: student.name,
      userEmail: student.email,
      responses,
    });
    res.json({ success: true, data: app });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET my applied jobs ───────────────────────────────
export const getApplied = async (req, res) => {
  try {
    // ✅ FIX: student sirf apni khud ki applications dekh sakta hai —
    // req.user.id (JWT) se, params ke userId se kisi aur ki nahi
    if (req.user.role !== "student" || req.user.id !== req.params.userId) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }
    const apps = await PlacementApplication.find({ userId: req.params.userId });
    res.json({ success: true, data: apps });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET applications for a job (admin) ───────────────
export const getJobApplications = async (req, res) => {
  try {
    // ✅ FIX: sirf wahi society applicants (naam/email/responses) dekh sake
    // jisne asal me job post kiya tha — pehle sirf jobId jaan kar koi bhi
    // saare applicants ka data dekh sakta tha
    if (req.user.role !== "society") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    const job = await Placement.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }
    const society = await Society.findById(req.user.id).select("societyId");
    if (!society || job.societyId !== society.societyId) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const apps = await PlacementApplication.find({ jobId: req.params.jobId });
    res.json({ success: true, data: apps });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

export const getJobsBySociety = async (req, res) => {
  try {
    const jobs = await Placement.find({ societyId: req.params.societyId }).sort(
      { createdAt: -1 },
    );
    res.json({ success: true, data: jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};