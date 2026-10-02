const express = require("express");
const User = require("../models/User");
const Message = require("../models/Message");
const Notification = require("../models/Notification");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate, authorize("admin", "manager", "sales_executive"));
const idOf = (value) => value.toString();
const conversationId = (first, second) => [idOf(first), idOf(second)].sort().join(":");
const preview = (value) => value.length > 90 ? `${value.slice(0, 87)}...` : value;
const serializeMessage = (message) => ({ id: message._id, conversationId: message.conversationId, senderId: message.sender?._id || message.sender, senderName: message.sender?.fullName, receiverId: message.receiver?._id || message.receiver, content: message.content, isRead: Boolean(message.readAt), createdAt: message.createdAt });

router.get("/people", async (req, res, next) => {
  try {
    const people = await User.find({ _id: { $ne: req.user._id }, role: { $in: ["admin", "manager", "sales_executive"] }, isActive: true }).select("fullName email role").sort("fullName");
    res.json({ success: true, data: people });
  } catch (error) { next(error); }
});

router.get("/conversations", async (req, res, next) => {
  try {
    const messages = await Message.find({ $or: [{ sender: req.user._id }, { receiver: req.user._id }] }).populate("sender", "fullName email role").populate("receiver", "fullName email role").sort("-createdAt").lean();
    const conversations = new Map();
    messages.forEach((message) => {
      if (conversations.has(message.conversationId)) return;
      const other = idOf(message.sender._id) === idOf(req.user._id) ? message.receiver : message.sender;
      conversations.set(message.conversationId, { conversationId: message.conversationId, person: { id: other._id, fullName: other.fullName, email: other.email, role: other.role }, lastMessage: serializeMessage(message), unreadCount: 0 });
    });
    messages.forEach((message) => { if (idOf(message.receiver._id) === idOf(req.user._id) && !message.readAt) conversations.get(message.conversationId).unreadCount += 1; });
    res.json({ success: true, data: [...conversations.values()] });
  } catch (error) { next(error); }
});

router.get("/conversations/:userId/messages", async (req, res, next) => {
  try {
    const person = await User.findOne({ _id: req.params.userId, role: { $in: ["admin", "manager", "sales_executive"] }, isActive: true }).select("fullName email role");
    if (!person) return res.status(404).json({ success: false, message: "Chat participant not found" });
    const id = conversationId(req.user._id, person._id);
    const messages = await Message.find({ conversationId: id }).populate("sender", "fullName").sort("createdAt");
    res.json({ success: true, data: { conversationId: id, person, messages: messages.map(serializeMessage) } });
  } catch (error) { next(error); }
});

router.post("/conversations/:userId/messages", async (req, res, next) => {
  try {
    const receiver = await User.findOne({ _id: req.params.userId, role: { $in: ["admin", "manager", "sales_executive"] }, isActive: true }).select("fullName email role");
    const content = String(req.body.content || "").trim();
    if (!receiver) return res.status(404).json({ success: false, message: "Chat participant not found" });
    if (!content) return res.status(400).json({ success: false, message: "Message cannot be empty" });
    const id = conversationId(req.user._id, receiver._id);
    const message = await Message.create({ conversationId: id, sender: req.user._id, receiver: receiver._id, content });
    const senderName = req.user.fullName || "A team member";
    await Notification.create({ recipient: receiver._id, type: "chat_message", title: "New Message", message: `${senderName}: ${preview(content)}`, entityType: "chat", entityId: id, sender: req.user._id, metadata: { conversationId: id, messageId: message._id.toString(), senderId: req.user._id.toString(), receiverId: receiver._id.toString(), preview: preview(content) } });
    const populated = await message.populate("sender", "fullName");
    res.status(201).json({ success: true, data: serializeMessage(populated) });
  } catch (error) { next(error); }
});

router.patch("/conversations/:userId/read", async (req, res, next) => {
  try {
    const id = conversationId(req.user._id, req.params.userId);
    await Message.updateMany({ conversationId: id, receiver: req.user._id, readAt: { $exists: false } }, { $set: { readAt: new Date() } });
    await Notification.updateMany({ recipient: req.user._id, type: "chat_message", entityType: "chat", entityId: id, readAt: { $exists: false } }, { $set: { readAt: new Date() } });
    res.json({ success: true, message: "Conversation marked as read" });
  } catch (error) { next(error); }
});

module.exports = router;