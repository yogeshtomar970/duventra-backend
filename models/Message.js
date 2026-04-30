import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId:   { type: String, required: true },  // userId / societyId
    receiverId: { type: String, required: true },  // userId / societyId
    text:       { type: String, required: true },
    read:       { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Message", messageSchema);
