// controllers/externalJobsController.js
// ✅ Ab ye controller Adzuna ko KABHI live call nahi karta. Data
// utils/externalJobsSync.js dwara cron se (din me 3-4 baar) MongoDB
// (ExternalJob collection) me pehle se fetch/store ho chuka hota hai.
// Ye controller sirf DB query karke pagination + filters (location,
// paid/unpaid, experience, remote) ke saath response deta hai — bahut
// fast hai aur Adzuna quota par bilkul depend nahi karta.
import ExternalJob from "../models/externalJobModel.js";

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 30;

// ✅ Frontend ab sirf 2 category buttons dikhata hai
const VALID_CATEGORIES = ["job", "internship"];
const VALID_EXPERIENCE = ["fresher", "0-2", "2-5", "5+"];

// ── GET /api/placement/external-jobs?category=job&location=Delhi&paid=paid&experience=fresher&remote=true&page=1&limit=15 ──
export const getExternalJobs = async (req, res) => {
  try {
    const {
      category = "job",
      location = "",
      paid = "",       // "paid" | "unpaid" | "" (any)
      experience = "", // "fresher" | "0-2" | "2-5" | "5+" | "" (any)
      remote = "",      // "true" | ""
    } = req.query;

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(req.query.limit, 10) || DEFAULT_LIMIT));

    const query = {
      category: VALID_CATEGORIES.includes(category) ? category : "job",
    };

    // Location filter — city field ya location string dono par match
    if (location && !/^india$/i.test(location.trim())) {
      const loc = location.trim();
      query.$or = [
        { city: new RegExp(loc, "i") },
        { location: new RegExp(loc, "i") },
      ];
    }

    if (paid === "paid" || paid === "unpaid") {
      query.payStatus = paid;
    }

    if (VALID_EXPERIENCE.includes(experience)) {
      query.experienceLevel = experience;
    }

    if (remote === "true") {
      query.isRemote = true;
    }

    const start = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      ExternalJob.find(query).sort({ postedAt: -1 }).skip(start).limit(limit).lean(),
      ExternalJob.countDocuments(query),
    ]);

    // Frontend ka existing shape (id, ...) barkarar rakhne ke liye map
    const data = jobs.map((j) => ({
      id: j.adzunaId,
      title: j.title,
      company: j.company,
      companyLogo: j.companyLogo,
      location: j.location,
      employmentType: j.employmentType,
      description: j.description,
      applyLink: j.applyLink,
      postedAt: j.postedAt,
      isRemote: j.isRemote,
      minSalary: j.minSalary,
      maxSalary: j.maxSalary,
      salaryCurrency: j.salaryCurrency,
      payStatus: j.payStatus,
      experienceLevel: j.experienceLevel,
      experienceLabel: j.experienceLabel,
      publisher: j.publisher,
      source: j.source,
    }));

    res.json({
      success: true,
      data,
      page,
      limit,
      total,
      hasMore: start + limit < total,
    });
  } catch (err) {
    console.error("getExternalJobs error:", err.message);
    res.status(500).json({ success: false, message: "Kuch galat ho gaya external jobs fetch karte waqt" });
  }
};