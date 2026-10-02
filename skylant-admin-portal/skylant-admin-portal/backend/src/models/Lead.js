const mongoose = require("mongoose");

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
  whatsapp: { type: String, trim: true },
  email: { type: String, lowercase: true, trim: true },
  college: { type: mongoose.Schema.Types.ObjectId, ref: "College" },
  course: String,
  branch: String,
  graduationYear: Number,
  city: String,
  program: { type: mongoose.Schema.Types.ObjectId, ref: "Program" },
  source: { type: String, default: "Other" },
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: "Campaign" },
  campaignCode: String,
  campusAmbassador: String,
  referralCode: String,
  status: { type: String, enum: ["NEW", "CONTACTED", "INTERESTED", "FOLLOW-UP", "NOT INTERESTED", "CONVERTED", "CLOSED", "LOST"], default: "NEW" },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  followUpDate: Date,
  lastContactedDate: Date,
  notes: String,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

leadSchema.index({ phone: 1 });
leadSchema.index({ whatsapp: 1 });
leadSchema.index({ email: 1 });
leadSchema.index({ status: 1, assignedTo: 1 });

module.exports = mongoose.model("Lead", leadSchema);
