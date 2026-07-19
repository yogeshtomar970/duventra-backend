// models/PlacementApplication.js
import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    jobId:     { type: mongoose.Schema.Types.ObjectId, ref: "Placement", required: true },
    userId:    { type: String, required: true },
    userName:  { type: String, default: "" },
    userEmail: { type: String, default: "" },
    responses: { type: Object, default: {} }, // custom field responses
  },
  { timestamps: true }
);

export default mongoose.model("PlacementApplication", applicationSchema);
