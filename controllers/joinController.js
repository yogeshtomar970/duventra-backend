import Join from "../models/Join.js";
import Society from "../models/Society.js";
import Student from "../models/Student.js";
import Notification from "../models/Notification.js";
import { getIO } from "../socket/ioInstance.js";
import { sendNotification } from "../socket/socket.js";

// Helper: get actor info from joinedBy ID
// Student joinedBy = "student_<mongoId>", Society joinedBy = societyId string
const getActorInfo = async (joinedBy) => {
  if (joinedBy && joinedBy.startsWith("student_")) {
    const mongoId = joinedBy.replace("student_", "");
    // Frontend sends user.id which is MongoDB _id
    let student = null;
    try {
      student = await Student.findById(mongoId).select(
        "name profilePic userId",
      );
    } catch (_) {}
    // Fallback: try userId field
    if (!student)
      student = await Student.findOne({ userId: mongoId }).select(
        "name profilePic userId",
      );
    if (student) {
      return {
        actorId: joinedBy,
        actorName: student.name,
        actorProfilePic: student.profilePic || "",
        actorRole: "student",
      };
    }
  } else {
    const society = await Society.findOne({ societyId: joinedBy }).select(
      "societyName profilePic",
    );
    if (society) {
      return {
        actorId: joinedBy,
        actorName: society.societyName,
        actorProfilePic: society.profilePic || "",
        actorRole: "society",
      };
    }
  }
  return {
    actorId: joinedBy,
    actorName: "Someone",
    actorProfilePic: "",
    actorRole: "",
  };
};

// Helper: get recipient info from targetId (always a societyId or student prefix)
const getRecipientInfo = async (targetId) => {
  // Check if targetId is a society
  const society = await Society.findOne({ societyId: targetId }).select(
    "societyName",
  );
  if (society)
    return { recipientType: "society", recipientName: society.societyName };

  // Check if student prefix
  if (targetId && targetId.startsWith("student_")) {
    const userId = targetId.replace("student_", "");
    const student = await Student.findOne({ userId }).select("name");
    if (student)
      return { recipientType: "student", recipientName: student.name };
  }

  return { recipientType: "society", recipientName: "" };
};
export const joinSociety = async (req, res) => {
  try {
    const { myId, targetId } = req.body;

    if (myId === targetId) {
      return res.status(400).json({ message: "Can't join yourself" });
    }

    // already joined check
    const already = await Join.findOne({
      joinedBy: myId,
      joinedTo: targetId,
    });

    if (already) {
      return res.json({ joined: true });
    }

    // direct save (NO EXTRA DATA)
    const newJoin = new Join({
      joinedBy: myId,
      joinedTo: targetId,
    });

    await newJoin.save();

    // 🔔 Send notification to the target (society or student being joined)
    try {
      const actor = await getActorInfo(myId);
      const recipient = await getRecipientInfo(targetId);

      const notification = await Notification.create({
        recipientId: targetId,
        recipientType: recipient.recipientType,
        type: "join",
        actorId: actor.actorId,
        actorName: actor.actorName,
        actorProfilePic: actor.actorProfilePic,
        actorRole: actor.actorRole,
        message: `${actor.actorName} joined you`,
      });

      // Real-time push
      try {
        const io = getIO();
        sendNotification(io, targetId, notification);
      } catch (_) {}
    } catch (notifErr) {
      console.warn("Join notification error (non-fatal):", notifErr.message);
    }

    res.json({ joined: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error" });
  }
};
export const unjoinSociety = async (req, res) => {
  try {
    const { myId, targetId } = req.body;

    await Join.findOneAndDelete({ joinedBy: myId, joinedTo: targetId });

    res.json({ joined: false });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Error" });
  }
};

export const checkJoined = async (req, res) => {
  const { myId, targetId } = req.params;

  const exists = await Join.findOne({
    joinedBy: myId,
    joinedTo: targetId,
  });

  res.json({ joined: !!exists });
};
export const getMembers = async (req, res) => {
  try {
    const { societyId } = req.params;

    // 🔥 jisne isko join kiya
    const joins = await Join.find({ joinedTo: societyId });

    // 🔥 un sab ke IDs nikalo
    const memberIds = joins.map((j) => j.joinedBy);

    // 🔥 Society members: jinke IDs Society collection mein hain
    const societyMembers = await Society.find({
      societyId: { $in: memberIds },
    }).select("societyName collegeName societyType profilePic societyId");

    // 🔥 Student members: jinke IDs "student_<userId>" format mein hain
    // Frontend student ke liye "student_" + userId bhejta hai as joinedBy
    const studentPrefixIds = memberIds.filter(
      (id) => id && id.startsWith("student_"),
    );
    const studentUserIds = studentPrefixIds.map((id) =>
      id.replace("student_", ""),
    );

    const studentMembers = await Student.find({
      userId: { $in: studentUserIds },
    }).select("name userId collegeName course year profilePic");

    // 🔥 Dono ko tag karke combine karo
    const tagged = [
      ...societyMembers.map((s) => ({
        ...s.toObject(),
        memberType: "society",
      })),
      ...studentMembers.map((s) => ({
        ...s.toObject(),
        memberType: "student",
      })),
    ];

    res.json({
      success: true,
      data: tagged,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error" });
  }
};
export const getFollowing = async (req, res) => {
  try {
    const { societyId } = req.params;

    // 🔥 tumne kisko join kiya
    const joins = await Join.find({ joinedBy: societyId });

    const targetIds = joins.map((j) => j.joinedTo);

    // 🔥 un societies ka data lao
    const following = await Society.find({
      societyId: { $in: targetIds },
    }).select("societyName collegeName societyType profilePic societyId");

    res.json({
      success: true,
      data: following,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error" });
  }
};
export const getSuggestions = async (req, res) => {
  try {
    const { societyId } = req.params;

    // 🔥 already followed societies
    const joins = await Join.find({ joinedBy: societyId });

    const followedIds = joins.map((j) => j.joinedTo);

    // 🔥 exclude: khud + already followed
    followedIds.push(societyId);

    // 🔥 baaki sab societies = suggestion
    const suggestions = await Society.find({
      societyId: { $nin: followedIds },
    }).select("societyName collegeName societyType profilePic societyId");

    res.json({
      success: true,
      data: suggestions,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error" });
  }
};
