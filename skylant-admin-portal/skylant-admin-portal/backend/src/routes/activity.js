const express = require("express");
const ActivityLog = require("../models/ActivityLog");
const Notification = require("../models/Notification");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);
router.get("/activity-logs", authorize("admin", "manager"), async (req, res, next) => { try { const data = await ActivityLog.find().populate("user", "fullName email").sort("-createdAt").limit(Number(req.query.limit) || 100); res.json({ success: true, data }); } catch (e) { next(e); } });
router.get("/notifications", async (req, res, next) => { try { const notifications = await Notification.find({ recipient: req.user._id }).populate("sender", "fullName email").sort("-createdAt").limit(100).lean(); const unreadCount = await Notification.countDocuments({ recipient: req.user._id, readAt: { $exists: false } }); res.json({ success: true, data: { notifications: notifications.map((item) => ({ ...item, id: item._id })), unreadCount } }); } catch (e) { next(e); } });
router.patch("/notifications/:id/read", async (req, res, next) => { try { const data = await Notification.findOneAndUpdate({ _id: req.params.id, recipient: req.user._id }, { readAt: new Date() }, { new: true }); res.json({ success: true, data }); } catch (e) { next(e); } });
module.exports = router;
