// models/Placement.js
import mongoose from "mongoose";

const customFieldSchema = new mongoose.Schema({
  fieldTitle: { type: String, required: true },
  fieldDescription: { type: String, default: "" },
});

const placementSchema = new mongoose.Schema(
  {
    title:        { type: String, required: true },
    jobType:      { type: String, required: true },
    location:     { type: String, default: "Delhi, India" },
    description:  { type: String, required: true },
    societyId:    { type: String, required: true },
    societyName:  { type: String, required: true },
    societyPic:   { type: String, default: "" },
    customFields: [customFieldSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Placement", placementSchema);
