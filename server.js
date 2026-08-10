import express from "express";
import cors from "cors";
import helmet from "helmet";
// import mongoSanitize from "express-mongo-sanitize";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import cron from "node-cron";
import connectDB from "./config/db.js";
import { generalLimiter } from "./middlewares/rateLimiter.js";
import { refreshExternalJobs } from "./utils/externalJobsSync.js";

import authRoutes from "./routes/authRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import societyRoutes from "./routes/societyRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import newsRoutes from "./routes/newsRoutes.js";
import likeRoutes from "./routes/likeRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import joinRoutes from "./routes/joinRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";

import placementRoutes from "./routes/placementRoutes.js";

import { initSocket } from "./socket/socket.js";
import { setIO } from "./socket/ioInstance.js";

dotenv.config();

// Critical env vars ke bina server start hi na ho — silent misconfiguration se bachne ke liye
const REQUIRED_ENV_VARS = ["JWT_SECRET", "MONGO_URI"];
for (const key of REQUIRED_ENV_VARS) {
  if (!process.env[key]) {
    console.error(`❌  Missing required env var: ${key}`);
    process.exit(1);
  }
}
if (process.env.JWT_SECRET.length < 32) {
  console.error("❌  JWT_SECRET is too short/weak. Use at least 32 random characters.");
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ FIX: hosting platform (Render/Railway/Vercel/Nginx waghera) ek reverse
// proxy ke peeche chalata hai. Iske bina express `req.ip` ko proxy ka IP
// samajh leta hai — matlab express-rate-limit SABHI users ko ek hi IP maan
// kar unka rate-limit bucket share kar deta hai. "1" = ek hop proxy trust
// karo (X-Forwarded-For ka sabse right wala IP le lo).
app.set("trust proxy", 1);

// Security headers (XSS, clickjacking, MIME-sniffing, hides X-Powered-By, etc.)
app.use(helmet());

app.use(
  cors({
    origin: ["https://duventra.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  }),
);

// Body size limits — bina limit ke bade payloads DoS kar sakte hain
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true, limit: "50kb" }));

// NoSQL injection protection — req.body/query/params se $ / . operators strip karta hai
// app.use(mongoSanitize());

// General rate limiting — sabhi routes par basic abuse protection
app.use(generalLimiter);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/society", societyRoutes);
app.use("/api/post", postRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/like", likeRoutes);
app.use("/api/comment", commentRoutes);
app.use("/api/join", joinRoutes);
app.use("/api/notification", notificationRoutes);
app.use("/api/message", messageRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/placement", placementRoutes);

app.get("/", (_, res) => res.json({ status: "ok", message: "Campus API 🚀" }));
app.use((_, res) => res.status(404).json({ message: "Route not found" }));

// Global error handler — client ko sirf generic message, full error sirf server logs me
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  const isProd = process.env.NODE_ENV === "production";
  res.status(err.status || 500).json({
    message: isProd ? "Something went wrong. Please try again later." : err.message,
  });
});

// HTTP server + Socket.IO
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "https://duventra.vercel.app"
    ],
    methods: ["GET", "POST"],
  },
});
setIO(io);
initSocket(io);

connectDB().then(() => {
  server.listen(PORT, "0.0.0.0", () =>
    console.log(`✅  Server + Socket.IO → http://localhost:${PORT}`),
  );

  // ✅ External jobs (Adzuna → MongoDB) sync
  // 1. Server start hote hi ek baar chalao — taaki DB kabhi khaali na mile
  // 2. Uske baad din me 4 baar (har 6 ghante — 12am, 6am, 12pm, 6pm IST)
  //    cron se automatically refresh hota rahega.
  refreshExternalJobs().catch((err) =>
    console.error("Initial external jobs sync failed:", err.message),
  );

  cron.schedule("0 */6 * * *", () => {
    refreshExternalJobs().catch((err) =>
      console.error("Scheduled external jobs sync failed:", err.message),
    );
  });
});