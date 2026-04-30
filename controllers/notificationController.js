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
