const mongoose = require("mongoose");

const attendanceSessionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  loginAt: { type: Date, required: true, default: Date.now },
  logoutAt: Date,
  loginIp: String,
  logoutIp: String,
  userAgent: String,
}, { timestamps: true });

module.exports = mongoose.model("AttendanceSession", attendanceSessionSchema);
