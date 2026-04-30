import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error("MONGO_URI not set in .env");
    await mongoose.connect(uri);
    console.log("✅  MongoDB Connected");
  } catch (error) {
    console.error("❌  MongoDB error:", error.message);
    process.exit(1);
  }
};

export default connectDB;
