const mongoose = require("mongoose");

const dailyReportSchema = new mongoose.Schema({
  salesExecutiveId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: String, required: true },
  leadsAssigned: { type: Number, min: 0, default: 0 },
  callsMade: { type: Number, min: 0, default: 0 },
  connected: { type: Number, min: 0, default: 0 },
  interested: { type: Number, min: 0, default: 0 },
  followUps: { type: Number, min: 0, default: 0 },
  converted: { type: Number, min: 0, default: 0 },
  whatsappConversations: { type: Number, min: 0, default: 0 },
  remarks: { type: String, trim: true, default: "" },
  status: { type: String, enum: ["submitted", "approved", "rejected"], default: "submitted" },
}, { timestamps: true });

dailyReportSchema.index({ salesExecutiveId: 1, date: 1 }, { unique: true });
dailyReportSchema.index({ date: 1, status: 1 });

module.exports = mongoose.model("DailyReport", dailyReportSchema);
