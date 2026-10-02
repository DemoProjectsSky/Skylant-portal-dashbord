const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  message: String,
  entityType: String,
  entityId: String,
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  readAt: Date,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

module.exports = mongoose.model("Notification", notificationSchema);
