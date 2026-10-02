const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  action: { type: String, required: true },
  module: { type: String, required: true },
  recordId: String,
  ip: String,
  userAgent: String,
}, { timestamps: true });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
