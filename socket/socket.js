// socket/socket.js
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

export const initSocket = (io) => {
  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;

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
