import jwt from "jsonwebtoken";

/**
 * verifyToken — protect any route that requires login.
 * Usage: router.post("/some-route", verifyToken, controller)
 *
 * Expects: Authorization: Bearer <token>
 * Sets:    req.user = { id, role }
 */
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, role }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
};
