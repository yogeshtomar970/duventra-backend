import mongoose from "mongoose";

const newsSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
  },
  image: {
    type: String,
  },
  uploadedBy: {
    type: String, // "student" or "society"
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
}, { timestamps: true });

export default mongoose.model("News", newsSchema);