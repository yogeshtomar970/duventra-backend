// models/ValidStudent.js
// Yeh model existing "validstudents" MongoDB collection se connect karta hai
// jisme college ke authorized students ka data pehle se stored hai.
// Signup ke waqt is collection se match check hota hai.

import mongoose from "mongoose";

const validStudentSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true },
    rollNo:      { type: String, required: true },
    course:      { type: String, required: true },
    collegeName: { type: String, required: true },
  },
  {
    collection: "validstudents", // exact collection name Atlas mein
    strict: false,               // extra fields ignore karega (jo schema mein nahi)
  }
);

export default mongoose.model("ValidStudent", validStudentSchema);