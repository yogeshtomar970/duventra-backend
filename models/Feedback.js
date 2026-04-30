import mongoose from "mongoose";

const feedbackSchema = new mongoose.Schema(
  {
    userId: { type: String, default: null },        // null if not logged in
    name: { type: String, default: "Anonymous" },
    email: { type: String, default: "" },
    role: { type: String, default: "" },            // student / society / guest
    message: { type: String, required: true },
    rating: { type: Number, min: 1, max: 5, default: null },
    page: { type: String, default: "homepage" },    // which page feedback came from
    type: { type: String, enum: ["bug", "feature", "other"], default: "other" },
  },
  { timestamps: true }
);

export default mongoose.model("Feedback", feedbackSchema);
