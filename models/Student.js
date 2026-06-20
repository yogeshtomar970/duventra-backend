import mongoose from "mongoose";

const studentSchema = new mongoose.Schema(
  {
    userId: { type: String, unique: true },
    name: String,
    rollNo: String,
    course: String,
    collegeName: String,
    email: { type: String, required: true, unique: true },
    year: String,
    password: String,
    idCard: String,
    profilePic: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

export default mongoose.model("Student", studentSchema);
