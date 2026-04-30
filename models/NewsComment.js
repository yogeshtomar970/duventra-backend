import mongoose from "mongoose";

const newsCommentSchema = new mongoose.Schema(
  {
    newsId:   { type: mongoose.Schema.Types.ObjectId, ref: "News", required: true },
    userId:   { type: String, required: true },
    userName: { type: String, default: "User" },
    text:     { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("NewsComment", newsCommentSchema);
