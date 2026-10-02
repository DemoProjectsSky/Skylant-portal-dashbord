const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
  groupName: { type: String, required: true, trim: true },
  collegeName: { type: String, required: true, trim: true },
  collegeCode: { type: String, trim: true },
  collegeLocation: String,
  city: String,
  state: String,
  ambassador: {
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    email: String,
  },
  ambassadorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  program: { type: String, enum: ["Training", "Internship", "Training + Internship"], required: true },
  course: { type: String, required: true, trim: true },
  batch: { type: String, required: true, trim: true },
  mode: { type: String, enum: ["Online", "Offline", "Hybrid"], required: true },
  expectedStudents: { type: Number, min: 1, required: true },
  qualificationTarget: { type: Number, min: 1, default: 30 },
  whatsappGroupLink: String,
  description: String,
  campaignStartDate: Date,
  campaignEndDate: Date,
  status: { type: String, enum: ["Active", "Paused", "Completed", "Inactive"], default: "Active" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  referralCode: { type: String, unique: true, index: true },
  collegeId: { type: mongoose.Schema.Types.ObjectId, ref: "College", default: null },
  programId: { type: mongoose.Schema.Types.ObjectId, ref: "Program", default: null },
}, { timestamps: true });

groupSchema.index({ groupName: "text", collegeName: "text", "ambassador.name": "text" });

module.exports = mongoose.model("Group", groupSchema);
