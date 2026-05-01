import Message from "../models/Message.js";
import Student from "../models/Student.js";
import Society from "../models/Society.js";
import { getIO } from "../socket/ioInstance.js";
import { getSocketId } from "../socket/socket.js";

// Kisi bhi userId/societyId se user info fetch karo
const getUserInfo = async (id) => {
  let u = await Student.findOne({ userId: id }).select(
    "userId name profilePic",
  );
  if (u) return { userId: u.userId, name: u.name, profilePic: u.profilePic };
  u = await Society.findOne({ societyId: id }).select(
    "societyId societyName profilePic",
  );
  if (u)
    return {
      userId: u.societyId,
      name: u.societyName,
      profilePic: u.profilePic,
    };
  return null;
};

// ── POST /api/message/send ────────────────────────────────────────────────────
export const sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, text } = req.body;

    if (!senderId || !receiverId || !text?.trim()) {
      return res
        .status(400)
        .json({ message: "senderId, receiverId and text are neccessary" });
    }

    const msg = await Message.create({
      senderId,
      receiverId,
      text: text.trim(),
    });

    // Real-time delivery
    try {
      const io = getIO();
      const sid = getSocketId(receiverId);
      if (sid) io.to(sid).emit("new_message", msg);
    } catch (_) {}

    return res.status(201).json(msg);
  } catch (err) {
    console.error("sendMessage error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── GET /api/message/conversation/:myId/:otherId ──────────────────────────────
export const getConversation = async (req, res) => {
  try {
    const { myId, otherId } = req.params;

    const msgs = await Message.find({
      $or: [
        { senderId: myId, receiverId: otherId },
        { senderId: otherId, receiverId: myId },
      ],
    }).sort({ createdAt: 1 });

    // Mark received messages as read
    await Message.updateMany(
      { senderId: otherId, receiverId: myId, read: false },
      { read: true },
    );

    return res.json(msgs);
  } catch (err) {
    console.error("getConversation error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── GET /api/message/inbox/:myId ──────────────────────────────────────────────
export const getInbox = async (req, res) => {
  try {
    const { myId } = req.params;

    const all = await Message.find({
      $or: [{ senderId: myId }, { receiverId: myId }],
    }).sort({ createdAt: -1 });

    // Latest message per other person
    const map = new Map();
    for (const msg of all) {
      const other = msg.senderId === myId ? msg.receiverId : msg.senderId;
      if (!map.has(other)) map.set(other, msg);
    }

    // Unread counts
    const unreadAgg = await Message.aggregate([
      { $match: { receiverId: myId, read: false } },
      { $group: { _id: "$senderId", count: { $sum: 1 } } },
    ]);
    const unreadMap = {};
    for (const x of unreadAgg) unreadMap[x._id] = x.count;

    // Build inbox
    const inbox = [];
    for (const [otherId, lastMsg] of map) {
      const info = await getUserInfo(otherId);
      if (!info) continue;
      inbox.push({
        user: info,
        lastMessage: lastMsg,
        unread: unreadMap[otherId] || 0,
      });
    }

    inbox.sort(
      (a, b) =>
        new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt),
    );

    return res.json(inbox);
  } catch (err) {
    console.error("getInbox error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── DELETE /api/message/:messageId ───────────────────────────────────────────
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body; // who is deleting

    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    // Only sender can delete
    if (msg.senderId !== userId) {
      return res
        .status(403)
        .json({ message: "only delete own message" });
    }

    await Message.findByIdAndDelete(messageId);

    // Notify receiver via socket
    try {
      const io = getIO();
      const sid = getSocketId(msg.receiverId);
      if (sid)
        io.to(sid).emit("message_deleted", { messageId, senderId: userId });
    } catch (_) {}

    return res.json({ message: "Message deleted", messageId });
  } catch (err) {
    console.error("deleteMessage error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── DELETE /api/message/conversation/:myId/:otherId ──────────────────────────
export const deleteConversation = async (req, res) => {
  try {
    const { myId, otherId } = req.params;

    await Message.deleteMany({
      $or: [
        { senderId: myId, receiverId: otherId },
        { senderId: otherId, receiverId: myId },
      ],
    });

    return res.json({ message: "Conversation deleted" });
  } catch (err) {
    console.error("deleteConversation error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ── GET /api/message/search?q=xxx&excludeId=yyy ───────────────────────────────
export const searchUsers = async (req, res) => {
  try {
    const { q, excludeId } = req.query;
    if (!q?.trim()) return res.json([]);

    const regex = { $regex: q.trim(), $options: "i" };

    const students = await Student.find({
      userId: { $ne: excludeId },
      $or: [{ name: regex }, { email: regex }],
    })
      .select("userId name profilePic email")
      .limit(8);

    const societies = await Society.find({
      societyId: { $ne: excludeId },
      $or: [{ societyName: regex }, { email: regex }],
    })
      .select("societyId societyName profilePic email")
      .limit(4);

    const results = [
      ...students.map((s) => ({
        userId: s.userId,
        name: s.name,
        profilePic: s.profilePic,
        email: s.email,
      })),
      ...societies.map((s) => ({
        userId: s.societyId,
        name: s.societyName,
        profilePic: s.profilePic,
        email: s.email,
      })),
    ];

    return res.json(results);
  } catch (err) {
    console.error("searchUsers error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
