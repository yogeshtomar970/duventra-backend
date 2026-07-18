// socket/socket.js
import jwt from "jsonwebtoken";
import Student from "../models/Student.js";
import Society from "../models/Society.js";

const onlineUsers = new Map(); // userId → socketId

export const getSocketId = (userId) => onlineUsers.get(userId);

// lastSeen DB mein save karo
const saveLastSeen = async (userId) => {
  const now = new Date();
  const updated = await Student.findOneAndUpdate({ userId }, { lastSeen: now });
  if (!updated) {
    await Society.findOneAndUpdate({ societyId: userId }, { lastSeen: now });
  }
};

// 🔒 Har socket connection JWT se verify hoti hai — client jo bhi userId
// query mein bheje, use IGNORE kiya jaata hai. Real identity hamesha
// verified token se hi nikalti hai, isliye koi doosre ka userId claim
// karke uske messages/typing/online-status intercept nahi kar sakta.
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET); // { id, role }

    let customId = null;
    if (decoded.role === "student") {
      const student = await Student.findById(decoded.id).select("userId");
      customId = student?.userId || null;
    } else if (decoded.role === "society") {
      const society = await Society.findById(decoded.id).select("societyId");
      customId = society?.societyId || null;
    }

    if (!customId) return next(new Error("User not found"));

    socket.verifiedUserId = customId; // ← ye ab trusted source hai
    next();
  } catch (err) {
    next(new Error("Invalid or expired token"));
  }
};

export const initSocket = (io) => {
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    const userId = socket.verifiedUserId; // ✅ ab client-supplied nahi, JWT-verified hai

    if (userId) {
      onlineUsers.set(userId, socket.id);
      socket.broadcast.emit("user_online", userId);
      console.log(`🟢 Connected: ${userId} → ${socket.id}`);
    }

    // Page load pe frontend puchhe kaun online hai
    socket.on("get_online_users", () => {
      socket.emit("online_users_list", Array.from(onlineUsers.keys()));
    });

    // Typing indicators
    socket.on("typing", ({ toUserId }) => {
      const sid = getSocketId(toUserId);
      if (sid) io.to(sid).emit("typing", { fromUserId: userId });
    });

    socket.on("stop_typing", ({ toUserId }) => {
      const sid = getSocketId(toUserId);
      if (sid) io.to(sid).emit("stop_typing", { fromUserId: userId });
    });

    // Read receipts
    socket.on("messages_read", ({ readerId, senderId }) => {
      const sid = getSocketId(senderId);
      if (sid) io.to(sid).emit("messages_read", { readerId, senderId });
    });

    socket.on("disconnect", () => {
      if (userId) {
        onlineUsers.delete(userId);
        socket.broadcast.emit("user_offline", userId);
        saveLastSeen(userId);
        console.log(`🔴 Disconnected: ${userId}`);
      }
    });
  });
};

// Helper: notification bhejo online user ko
export const sendNotification = (io, recipientId, notification) => {
  const socketId = getSocketId(recipientId);
  if (socketId) {
    io.to(socketId).emit("new_notification", notification);
  }
};