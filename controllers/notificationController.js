import Notification from "../models/Notification.js";

// GET all notifications for a recipient
export const getNotifications = async (req, res) => {
  try {
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
    const { recipientId } = req.body;
    await Notification.updateMany({ recipientId, isRead: false }, { isRead: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

// MARK single as read
export const markOneRead = async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndUpdate(id, { isRead: true });
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
    await Notification.deleteMany({ _id: { $in: ids } });
    res.json({ success: true, deleted: ids.length });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
};

// DELETE ALL notifications for a recipient — body: { recipientId }
export const deleteAll = async (req, res) => {
  try {
    const { recipientId } = req.body;
    if (!recipientId)
      return res.status(400).json({ success: false, message: "recipientId required" });
    await Notification.deleteMany({ recipientId });
    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
};
