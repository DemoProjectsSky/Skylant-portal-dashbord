const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, lowercase: true, trim: true },
  phone: String,
  whatsapp: String,
  college: { type: mongoose.Schema.Types.ObjectId, ref: "College" },
  course: String,
  branch: String,
  passingYear: Number,
  city: String,
  program: { type: mongoose.Schema.Types.ObjectId, ref: "Program" },
  batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch" },
  group: { type: mongoose.Schema.Types.ObjectId, ref: "Group" },
  enrollmentId: { type: String, unique: true, sparse: true },
  joiningDate: Date,
  trainingStatus: { type: String, enum: ["Registered", "Active", "Training", "Internship", "Completed", "Dropped", "Cancelled"], default: "Registered" },
  paymentStatus: { type: String, enum: ["Pending", "Partial", "Paid"], default: "Pending" },
  assignedCounselor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  documents: [{ name: String, url: String }],
  notes: String,
  convertedFromLead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead" },
}, { timestamps: true });

module.exports = mongoose.model("Student", studentSchema);
