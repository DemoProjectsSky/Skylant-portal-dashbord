const express = require("express");
const Meeting = require("../models/Meeting");
const Notification = require("../models/Notification");
const User = require("../models/User");
const Lead = require("../models/Lead");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
const leadStatuses = ["NEW", "CONTACTED", "INTERESTED", "FOLLOW-UP", "NOT INTERESTED", "CONVERTED", "CLOSED", "LOST"];
router.use(authenticate, authorize("admin", "manager", "sales_executive", "other"));

function visibleTo(user) {
  return ["admin", "manager"].includes(user.role) ? {} : { participants: user._id };
}

function meetingData(meeting) {
  return meeting.populate([
    { path: "createdBy", select: "fullName email role" },
    { path: "participants", select: "fullName email role" },
    { path: "lead", select: "name status followUpDate assignedTo" },
    { path: "noteHistory.author", select: "fullName role" },
  ]);
}

async function notify(users, sender, meeting, title, message) {
  const recipients = [...new Set(users.map((user) => String(user)).filter((id) => id !== String(sender)))];
  if (!recipients.length) return;
  await Notification.insertMany(recipients.map((recipient) => ({
    recipient,
    sender,
    type: "meeting",
    title,
    message,
    entityType: "meeting",
    entityId: String(meeting._id),
    metadata: { navigationPath: "/workspace" },
  })));
}

router.get("/", async (req, res, next) => {
  try {
    const meetings = await Meeting.find(visibleTo(req.user)).sort({ startsAt: 1 }).limit(200);
    res.json({ success: true, data: await Promise.all(meetings.map(meetingData)) });
  } catch (error) { next(error); }
});

router.post("/", authorize("admin", "manager"), async (req, res, next) => {
  try {
    const { title, description, startsAt, meetingLink, participantIds, leadId } = req.body;
    const startDate = new Date(startsAt);
    let url;
    try { url = new URL(meetingLink); } catch { url = null; }
    if (!String(title || "").trim() || !startsAt || Number.isNaN(startDate.getTime()) || !url || !["http:", "https:"].includes(url.protocol)) {
      return res.status(400).json({ success: false, message: "Title, valid date/time and an http(s) meeting link are required", error: "VALIDATION_ERROR" });
    }
    const ids = [...new Set(Array.isArray(participantIds) ? participantIds.map(String) : [])];
    if (!ids.length) return res.status(400).json({ success: false, message: "Choose at least one team member", error: "VALIDATION_ERROR" });
    const participants = await User.find({ _id: { $in: ids }, role: { $in: ["sales_executive", "other"] }, isActive: true }).select("_id");
    if (participants.length !== ids.length) return res.status(400).json({ success: false, message: "One or more selected team members are invalid", error: "INVALID_PARTICIPANTS" });
    let lead;
    if (leadId) {
      lead = await Lead.findById(leadId).select("_id assignedTo");
      if (!lead || !participants.some((person) => String(person._id) === String(lead.assignedTo))) return res.status(400).json({ success: false, message: "The selected lead must belong to a meeting participant", error: "INVALID_LEAD" });
    }
    const meeting = await Meeting.create({ title: String(title).trim(), description: String(description || "").trim(), startsAt: startDate, meetingLink: url.toString(), createdBy: req.user._id, participants: participants.map((person) => person._id), lead: lead?._id });
    await notify(participants.map((person) => person._id), req.user._id, meeting, "New meeting scheduled", `${meeting.title} · ${startDate.toLocaleString()}`);
    res.status(201).json({ success: true, message: "Meeting scheduled", data: await meetingData(meeting) });
  } catch (error) { next(error); }
});

router.patch("/:id", async (req, res, next) => {
  try {
    const meeting = await Meeting.findOne({ _id: req.params.id, ...visibleTo(req.user) });
    if (!meeting) return res.status(404).json({ success: false, message: "Meeting not found", error: "MEETING_NOT_FOUND" });
    if (req.user.role === "other" && ["nextFollowUp", "leadStatus"].some((field) => Object.hasOwn(req.body, field))) {
      return res.status(403).json({ success: false, message: "Other team members can add meeting notes and outcomes but cannot update lead details", error: "FORBIDDEN" });
    }
    const editableFields = ["notes", "outcome", "nextFollowUp", "leadStatus"];
    if (!editableFields.some((field) => Object.hasOwn(req.body, field))) return res.status(400).json({ success: false, message: "Add meeting notes, an outcome or follow-up details", error: "VALIDATION_ERROR" });
    const note = { author: req.user._id };
    if (Object.hasOwn(req.body, "notes")) note.notes = String(req.body.notes || "").trim();
    if (Object.hasOwn(req.body, "outcome")) note.outcome = String(req.body.outcome || "").trim();
    if (Object.hasOwn(req.body, "nextFollowUp")) {
      const date = req.body.nextFollowUp ? new Date(req.body.nextFollowUp) : null;
      if (date && Number.isNaN(date.getTime())) return res.status(400).json({ success: false, message: "Enter a valid follow-up date", error: "VALIDATION_ERROR" });
      note.nextFollowUp = date;
    }
    if (Object.hasOwn(req.body, "leadStatus")) {
      if (req.body.leadStatus && !leadStatuses.includes(req.body.leadStatus)) return res.status(400).json({ success: false, message: "Choose a valid lead status", error: "VALIDATION_ERROR" });
      note.leadStatus = req.body.leadStatus || "";
    }
    for (const field of editableFields) {
      if (Object.hasOwn(req.body, field)) meeting[field] = note[field];
    }
    meeting.noteHistory.push(note);
    await meeting.save();
    if (meeting.lead && (note.nextFollowUp || note.leadStatus)) {
      const leadUpdates = {};
      if (note.nextFollowUp) leadUpdates.followUpDate = note.nextFollowUp;
      if (note.leadStatus) leadUpdates.status = note.leadStatus;
      await Lead.findByIdAndUpdate(meeting.lead, { $set: leadUpdates });
    }
    await notify([meeting.createdBy, ...meeting.participants], req.user._id, meeting, "Meeting updated", `${req.user.fullName} added notes or a follow-up to ${meeting.title}.`);
    res.json({ success: true, message: "Meeting update shared", data: await meetingData(meeting) });
  } catch (error) { next(error); }
});

module.exports = router;