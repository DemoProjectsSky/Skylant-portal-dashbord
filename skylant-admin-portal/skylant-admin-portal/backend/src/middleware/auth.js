const jwt = require("jsonwebtoken");
const User = require("../models/User");

function signToken(user, sessionId) {
  return jwt.sign({ sub: user._id.toString(), role: user.role, sessionId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
}

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return res.status(401).json({ success: false, message: "Authentication required", error: "AUTH_REQUIRED" });
    const payload = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).select("-passwordHash");
    if (!user || !user.isActive) return res.status(401).json({ success: false, message: "Session is invalid", error: "INVALID_SESSION" });
    req.user = user;
    req.sessionId = payload.sessionId;
    next();
  } catch (error) {
    next(Object.assign(new Error("Invalid or expired token"), { status: 401, code: "INVALID_TOKEN" }));
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, message: "You do not have permission for this action", error: "FORBIDDEN" });
    next();
  };
}

module.exports = { authenticate, authorize, signToken };
