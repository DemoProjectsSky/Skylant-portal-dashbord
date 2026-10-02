const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true },
  mobile: { type: String, required: true, trim: true },
  whatsappNumber: String,
  collegeName: String,
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: "College", default: null },
  course: String,
  graduationYear: Number,
  programInterested: String,
  programId: { type: mongoose.Schema.Types.ObjectId, ref: "Program", default: null },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null },
  ambassadorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  referralCode: { type: String, trim: true, index: true },
  source: { type: String, default: "Campus Ambassador Referral" },
  status: { type: String, enum: ["New", "Follow-up", "Interested", "Converted", "Closed"], default: "New" },
  notes: String,
  message: String,
  city: String,
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

registrationSchema.index({ email: 1, mobile: 1 });
registrationSchema.index({ groupId: 1, createdAt: -1 });

module.exports = mongoose.model("Registration", registrationSchema);
