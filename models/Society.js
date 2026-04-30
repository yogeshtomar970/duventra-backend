import mongoose from "mongoose";

const societySchema = new mongoose.Schema(
  {
    societyName: { type: String, required: true },

    societyType: {
      type: String,
      enum: [
        "Academic & Literary",
        "Cultural & Arts",
        "Social & Service",
        "Specialized Cells",
        "Technical & Hobby",
      ],
      required: true,
    },
    societyId: {
      type: String,
      unique: true,
    },
    collegeName: String,

    coordinatorName: {
      type: String,
      default: "",
    },

    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    profilePic: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
    },

    committee: [
      {
        studentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Student",
        },
        post: {
          type: String,
          enum: [
            "President",
            "Vice President",
            "Secretary",
            "Joint Secretary",
            "Treasurer",
            "Marketing Head",
            "Finance Head",
            "Public Relations (PR) Head",
            "Creative Head",
            "Content Head",
            "Logistics Head",
          ],
        },
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model("Society", societySchema);
