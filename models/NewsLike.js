import mongoose from "mongoose";

const newsLikeSchema = new mongoose.Schema(
  {
    newsId: { type: mongoose.Schema.Types.ObjectId, ref: "News", required: true },
    userId: { type: String, required: true }, // can be societyId or MongoDB _id string
  },
  { timestamps: true }
);

// Prevent duplicate likes
newsLikeSchema.index({ newsId: 1, userId: 1 }, { unique: true });

export default mongoose.model("NewsLike", newsLikeSchema);
