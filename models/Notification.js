import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    // Who receives this notification
    recipientId: {
      type: String,
      required: true,
      index: true,
    },
    recipientType: {
      type: String,
      enum: ["society", "student"],
      required: true,
    },

    // What triggered it
    type: {
      type: String,
      enum: ["like", "comment", "new_post", "join"],
      required: true,
    },

    // Who triggered it
    actorId: {
      type: String,
      required: true,
    },
    actorName: {
      type: String,
      default: "",
    },
    actorProfilePic: {
      type: String,
      default: "",
    },
    actorRole: {
      type: String,
      enum: ["student", "society", ""],
      default: "",
    },

    // Whether this notification is from a post or news
    sourceType: {
      type: String,
      enum: ["post", "news"],
      default: "post",
    },

    // Related post
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
    postImage: {
      type: String,
      default: "",
    },

    // For new_post: the society that posted
    societyName: {
      type: String,
      default: "",
    },

    message: {
      type: String,
      default: "",
    },

    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
