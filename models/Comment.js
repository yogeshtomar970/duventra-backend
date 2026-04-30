import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
    },
    userId: {
      type: String,   // societyId for societies, MongoDB _id string for students
      required: true,
    },
    userName: {
      type: String,
      default: "User", // display name shown in comment
    },
    userRole: {
      type: String,
      enum: ["student", "society"],
      default: "student",
    },
    text: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Comment", commentSchema);
