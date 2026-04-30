import Feedback from "../models/Feedback.js";

// POST /api/feedback  — submit feedback
export const submitFeedback = async (req, res) => {
  try {
    const { message, rating, page, type } = req.body;

    if (!message || message.trim().length < 3) {
      return res.status(400).json({ message: "Feedback message is required." });
    }

    // Pull user info from localStorage data sent in body (optional)
    const { userId, name, email, role } = req.body;

    const feedback = await Feedback.create({
      userId: userId || null,
      name: name || "Anonymous",
      email: email || "",
      role: role || "guest",
      message: message.trim(),
      rating: rating || null,
      page: page || "homepage",
      type: type || "other",
    });

    res.status(201).json({ message: "Feedback submitted successfully!", feedback });
  } catch (err) {
    console.error("Feedback error:", err);
    res.status(500).json({ message: "Server error while saving feedback." });
  }
};

// GET /api/feedback  — get all feedbacks (admin/debug)
export const getAllFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
