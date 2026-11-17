const mongoose = require("mongoose");

const meetingNoteSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  notes: { type: String, trim: true, default: "" },
  outcome: { type: String, trim: true, default: "" },
  nextFollowUp: Date,
  leadStatus: String,
}, { timestamps: true });

const meetingSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true, default: "" },
  startsAt: { type: Date, required: true },
  meetingLink: { type: String, required: true, trim: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
  lead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
  notes: { type: String, trim: true, default: "" },
  outcome: { type: String, trim: true, default: "" },
  nextFollowUp: Date,
  leadStatus: String,
  noteHistory: [meetingNoteSchema],
}, { timestamps: true });

meetingSchema.index({ participants: 1, startsAt: 1 });
meetingSchema.index({ createdBy: 1, startsAt: 1 });

module.exports = mongoose.model("Meeting", meetingSchema);