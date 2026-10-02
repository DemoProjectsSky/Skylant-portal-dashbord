const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate, authorize("admin", "manager"));
router.get("/", async (req, res, next) => { try { const data = await User.find().select("fullName email phone role isActive createdAt").sort("fullName"); res.json({ success: true, data }); } catch (e) { next(e); } });
router.post("/", async (req, res, next) => { try { const { fullName, email, password, role, phone } = req.body; if (!fullName || !email || !password || !role) return res.status(400).json({ success: false, message: "Full name, email, password and role are required", error: "VALIDATION_ERROR" }); const user = await User.create({ fullName, email, phone, role, passwordHash: await bcrypt.hash(password, 12) }); await ActivityLog.create({ user: req.user._id, action: "created", module: "users", recordId: user._id, ip: req.ip, userAgent: req.get("user-agent") }); res.status(201).json({ success: true, data: { id: user._id, fullName: user.fullName, email: user.email, role: user.role, isActive: user.isActive } }); } catch (e) { next(e); } });
router.patch("/:id", async (req, res, next) => { try { const data = await User.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true }).select("fullName email phone role isActive createdAt"); if (!data) return res.status(404).json({ success: false, message: "User not found", error: "USER_NOT_FOUND" }); res.json({ success: true, data }); } catch (e) { next(e); } });
router.delete("/:id", async (req, res, next) => { try { if (req.params.id === req.user._id.toString()) return res.status(400).json({ success: false, message: "You cannot delete your own account", error: "SELF_DELETE" }); await User.findByIdAndUpdate(req.params.id, { isActive: false }); res.json({ success: true, message: "User deactivated" }); } catch (e) { next(e); } });
module.exports = router;
