import mongoose from "mongoose";

const studentFollowSchema = new mongoose.Schema({
  followedBy: {
    type: String,   // student _id  OR  society societyId
    required: true,
  },
  followedTo: {
    type: String,   // student _id
    required: true,
  },
  followerType: {
    type: String,
    enum: ["student", "society"],
    default: "student",
  },
}, { timestamps: true });

export default mongoose.model("StudentFollow", studentFollowSchema);
