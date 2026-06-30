import mongoose from "mongoose";

// Yeh collection college se mila official data store karta hai —
// student signup ke time isi se match karke validate karte hain ki
// banda actually us college ka real student hai.
const validStudentSchema = new mongoose.Schema(
  {
    name: String,
    rollNo: String,
    course: String,
    collegeName: String,
  },
  { timestamps: true, collection: "validstudents" }, // ← exact collection name
);

export default mongoose.model("ValidStudent", validStudentSchema);