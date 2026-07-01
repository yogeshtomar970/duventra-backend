import mongoose from "mongoose";

const societyEmailSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  societyName: { type: String },
  collegeName: { type: String },
}, { timestamps: true });

export default mongoose.model("SocietyEmail", societyEmailSchema);