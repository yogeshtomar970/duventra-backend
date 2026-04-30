// socket/socket.js
const onlineUsers = new Map(); // userId → socketId

export const getSocketId = (userId) => onlineUsers.get(userId);

export const initSocket = (io) => {
  io.on("connection", (socket) => {
    const userId = socket.handshake.query.userId;

    if (userId) {
      onlineUsers.set(userId, socket.id);
      // Broadcast online status to all
      socket.broadcast.emit("user_online", userId);
      console.log(`🟢 Connected: ${userId} → ${socket.id}`);
    }

    // Typing indicators — relay to target user
    socket.on("typing", ({ toUserId }) => {
      const sid = getSocketId(toUserId);
      if (sid) io.to(sid).emit("typing", { fromUserId: userId });
    });

    socket.on("stop_typing", ({ toUserId }) => {
      const sid = getSocketId(toUserId);
      if (sid) io.to(sid).emit("stop_typing", { fromUserId: userId });
    });

    socket.on("disconnect", () => {
      if (userId) {
        onlineUsers.delete(userId);
        socket.broadcast.emit("user_offline", userId);
        console.log(`🔴 Disconnected: ${userId}`);
      }
    });
  });
};

// Helper: send a real-time notification to a specific user if online
export const sendNotification = (io, recipientId, notification) => {
  const socketId = getSocketId(recipientId);
  if (socketId) {
    io.to(socketId).emit("new_notification", notification);
  }
};
