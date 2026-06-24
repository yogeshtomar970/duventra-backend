import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      default: "",
    },
    eventTypes: {
      type: [String], // array of strings
      default: [],
    },
    formLink: {
      type: String,
      default: "",
    },
    startDate: {
      type: Date,
      default: null,
    },
    lastDate: {
      type: Date,
      default: null, // event kab tak chalega — isi se "Upcoming" decide hota hai
    },
    societyId: {
      type: String,
      required: true,
    },
    // society details
    societyName: {
      type: String,
      required: true,
    },

    societyType: {
      type: String,
      required: true,
    },

    collegeName: {
      type: String,
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    // Unique viewers track karne ke liye (IP ya userId) — double count rokta hai
    viewedBy: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

// Fast sort on feed query
postSchema.index({ createdAt: -1 });
// Upcoming filter
postSchema.index({ lastDate: 1 });

export default mongoose.model("Post", postSchema);