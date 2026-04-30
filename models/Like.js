import mongoose from "mongoose";

const likeSchema = new mongoose.Schema(
  {
    // userId stores either societyId (for society) or MongoDB _id string (for student)
    userId: {
      type: String,
      required: true,
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
  },
  { timestamps: true }
);

// Prevent double-liking
likeSchema.index({ userId: 1, postId: 1 }, { unique: true });

export default mongoose.model("Like", likeSchema);
