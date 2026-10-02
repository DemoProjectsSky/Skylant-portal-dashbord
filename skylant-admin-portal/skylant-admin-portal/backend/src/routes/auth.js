const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const AttendanceSession = require("../models/AttendanceSession");
const { authenticate, signToken } = require("../middleware/auth");

const router = express.Router();
const publicUser = (user) => ({ id: user._id, full_name: user.fullName, email: user.email, phone: user.phone, role: user.role, is_active: user.isActive });
async function startSession(user, req) {
  const session = await AttendanceSession.create({ user: user._id, loginAt: new Date(), loginIp: req.ip, userAgent: req.get("user-agent") });
  return signToken(user, session._id.toString());
}

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, role = "sales_executive", phone } = req.body;
    if (!name || !email || !password) return res.status(400).json({ success: false, message: "Name, email and password are required", error: "VALIDATION_ERROR" });
    if (password.length < 6) return res.status(400).json({ success: false, message: "Password must be at least 6 characters", error: "VALIDATION_ERROR" });
    if (!["manager", "sales_executive"].includes(role)) return res.status(403).json({ success: false, message: "Only manager or sales executive registration is allowed", error: "ROLE_NOT_ALLOWED" });
    if (await User.exists({ email: email.toLowerCase() })) return res.status(409).json({ success: false, message: "Email is already registered", error: "EMAIL_EXISTS" });
    const user = await User.create({ fullName: name, email, phone, role, passwordHash: await bcrypt.hash(password, 12) });
    res.status(201).json({ success: true, message: "Account created", data: { token: await startSession(user, req), user: publicUser(user) } });
  } catch (error) { next(error); }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() }).select("+passwordHash");
    if (!user || !user.isActive || !(await bcrypt.compare(password || "", user.passwordHash))) return res.status(401).json({ success: false, message: "Invalid email or password", error: "INVALID_CREDENTIALS" });
    res.json({ success: true, message: "Login successful", data: { token: await startSession(user, req), user: publicUser(user) } });
  } catch (error) { next(error); }
});

router.get("/me", authenticate, (req, res) => res.json({ success: true, data: { user: publicUser(req.user) } }));
router.patch("/me", authenticate, async (req, res, next) => {
  try {
    const updates = {};
    if (req.body.fullName !== undefined) {
      const fullName = String(req.body.fullName).trim();
      if (!fullName) return res.status(400).json({ success: false, message: "Full name is required", error: "VALIDATION_ERROR" });
      updates.fullName = fullName;
    }
    if (req.body.email !== undefined) {
      const email = String(req.body.email).trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ success: false, message: "Enter a valid email address", error: "VALIDATION_ERROR" });
      if (await User.exists({ email, _id: { $ne: req.user._id } })) return res.status(409).json({ success: false, message: "Email is already in use", error: "EMAIL_EXISTS" });
      updates.email = email;
    }
    if (req.body.phone !== undefined) updates.phone = String(req.body.phone).trim();
    if (!Object.keys(updates).length) return res.status(400).json({ success: false, message: "No profile changes were provided", error: "VALIDATION_ERROR" });

    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true });
    res.json({ success: true, message: "Profile updated", data: publicUser(user) });
  } catch (error) { next(error); }
});
router.post("/logout", authenticate, async (req, res, next) => {
  try {
    if (req.sessionId) {
      await AttendanceSession.findOneAndUpdate(
        { _id: req.sessionId, user: req.user._id, logoutAt: { $exists: false } },
        { logoutAt: new Date(), logoutIp: req.ip },
      );
    }
    res.json({ success: true, message: "Logout recorded" });
  } catch (error) { next(error); }
});
router.post("/change-password", authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (typeof newPassword !== "string" || newPassword.length < 8) return res.status(400).json({ success: false, message: "New password must be at least 8 characters", error: "VALIDATION_ERROR" });
    const user = await User.findById(req.user._id).select("+passwordHash");
    if (!(await bcrypt.compare(currentPassword || "", user.passwordHash))) return res.status(401).json({ success: false, message: "Current password is incorrect", error: "INVALID_PASSWORD" });
    user.passwordHash = await bcrypt.hash(newPassword, 12); await user.save();
    res.json({ success: true, message: "Password changed" });
  } catch (error) { next(error); }
});

module.exports = router;
