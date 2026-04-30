import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import connectDB from "./config/db.js";

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

import { initSocket } from "./socket/socket.js";
import { setIO } from "./socket/ioInstance.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: ["https://duventra-frontend.vercel.app"],
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

app.get("/", (_, res) => res.json({ status: "ok", message: "Campus API 🚀" }));
app.use((_, res) => res.status(404).json({ message: "Route not found" }));
app.use((err, _, res, __) => res.status(500).json({ message: err.message }));

// HTTP server + Socket.IO
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "https://duventra-frontend.vercel.app"
    ],
    methods: ["GET", "POST"],
  },
});
setIO(io);
initSocket(io);

connectDB().then(() =>
  server.listen(PORT, "0.0.0.0", () =>
    console.log(`✅  Server + Socket.IO → http://localhost:${PORT}`),
  ),
);
