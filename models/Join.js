import mongoose from "mongoose";

const joinSchema = new mongoose.Schema({
  joinedBy: {
    type: String, // societyId
    required: true,
  },
  joinedTo: {
    type: String, // societyId
    required: true,
  },
}, { timestamps: true });

export default mongoose.model("Join", joinSchema);