import Student from "../models/Student.js";
import Society from "../models/Society.js";

// ── Comment / Like ──────────────────────────────────────────────────────────
// userId convention: society -> custom societyId string, student -> MongoDB _id string
export const resolvePostActorId = async (user) => {
  if (!user) return null;
  if (user.role === "society") {
    const society = await Society.findById(user.id).select("societyId");
    return society?.societyId || null;
  }
  if (user.role === "student") {
    return user.id; // Student docs use their own MongoDB _id here
  }
  return null;
};

// ── Join (society-to-society follow) ────────────────────────────────────────
// joinedBy convention: society -> societyId string, student -> "student_<mongoId>"
export const resolveJoinActorId = async (user) => {
  if (!user) return null;
  if (user.role === "society") {
    const society = await Society.findById(user.id).select("societyId");
    return society?.societyId || null;
  }
  if (user.role === "student") {
    return `student_${user.id}`;
  }
  return null;
};

// ── StudentFollow ────────────────────────────────────────────────────────────
// followedBy convention: society -> societyId string, student -> MongoDB _id string
export const resolveFollowActorId = async (user) => {
  if (!user) return null;
  if (user.role === "society") {
    const society = await Society.findById(user.id).select("societyId");
    return society?.societyId || null;
  }
  if (user.role === "student") {
    return user.id;
  }
  return null;
};

// ── Messages ─────────────────────────────────────────────────────────────────
// senderId/receiverId convention: society -> societyId string, student -> custom userId string
export const resolveMessageActorId = async (user) => {
  if (!user) return null;
  if (user.role === "society") {
    const society = await Society.findById(user.id).select("societyId");
    return society?.societyId || null;
  }
  if (user.role === "student") {
    const student = await Student.findById(user.id).select("userId");
    return student?.userId || null;
  }
  return null;
};