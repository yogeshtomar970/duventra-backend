import Notification from "../models/Notification.js";
import Student from "../models/Student.js";
import Society from "../models/Society.js";

// ✅ Har user ka "recipientId" alag scheme follow karta hai — student ke liye
// uska custom `userId` field, society ke liye uska custom `societyId` field
// (dono mongo _id se alag hain). Ye helper JWT (req.user, jo mongo _id deta
// hai) se current user ka asli recipientId resolve karta hai, taaki hum
// client-supplied recipientId par bharosa na karein.
const resolveOwnRecipientId = async (user) => {
  if (!user) return null;
  if (user.role === "student") {
    const student = await Student.findById(user.id).select("userId");
    return student?.userId || null;
  }
  if (user.role === "society") {
    const society = await Society.findById(user.id).select("societyId");
    return society?.societyId || null;
  }
  return null;
};

// GET all notifications for a recipient
export const getNotifications = async (req, res) => {
  try {
    // ✅ FIX: sirf apni khud ki notifications — JWT se resolve, params se nahi
    const myRecipientId = await resolveOwnRecipientId(req.user);
    if (!myRecipientId || myRecipientId !== req.params.recipientId) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const { recipientId } = req.params;
    const notifications = await Notification.find({ recipientId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, notifications });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
};

// GET unread count
export const getUnreadCount = async (req, res) => {
  try {
    // ✅ FIX: sirf apna khud ka unread count — JWT se resolve, params se nahi
    const myRecipientId = await resolveOwnRecipientId(req.user);
    if (!myRecipientId || myRecipientId !== req.params.recipientId) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const { recipientId } = req.params;
    const count = await Notification.countDocuments({ recipientId, isRead: false });
    res.json({ success: true, count });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

// MARK all as read
export const markAllRead = async (req, res) => {
  try {
    // ✅ FIX: recipientId ab JWT se resolve hota hai, body se nahi — pehle
    // koi bhi authenticated (ya unauthenticated, route protect nahi tha)
    // request kisi bhi user ki saari notifications read mark kar sakti thi
    const recipientId = await resolveOwnRecipientId(req.user);
    if (!recipientId) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    await Notification.updateMany({ recipientId, isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

// MARK single as read
export const markOneRead = async (req, res) => {
  try {
    // ✅ FIX: pehle verify karo ki notification asal me isi user ki hai —
    // pehle koi bhi Mongo _id guess kar ke kisi aur ki notification mark
    // kar sakta tha
    const { id } = req.params;
    const recipientId = await resolveOwnRecipientId(req.user);
    if (!recipientId) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    const notification = await Notification.findOne({ _id: id, recipientId });
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    notification.isRead = true;
    await notification.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

// DELETE selected notifications — body: { ids: ["id1","id2",...] }
export const deleteSelected = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ success: false, message: "ids required" });

    // ✅ FIX: scoped to recipientId ab JWT se — pehle koi bhi _id guess
    // karke kisi bhi user ki notification delete kar sakta tha
    const recipientId = await resolveOwnRecipientId(req.user);
    if (!recipientId) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    const result = await Notification.deleteMany({ _id: { $in: ids }, recipientId });
    res.json({ success: true, deleted: result.deletedCount });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
};

// DELETE ALL notifications for a recipient — body: { recipientId }
export const deleteAll = async (req, res) => {
  try {
    // ✅ FIX: recipientId ab JWT se resolve hota hai, body se nahi — pehle
    // koi bhi (route par protect bhi nahi tha) kisi bhi user ki saari
    // notifications delete kar sakta tha
    const recipientId = await resolveOwnRecipientId(req.user);
    if (!recipientId) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    await Notification.deleteMany({ recipientId });
    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
};