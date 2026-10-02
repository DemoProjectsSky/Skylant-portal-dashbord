const mongoose = require("mongoose");

const followUpSchema = new mongoose.Schema({
  lead: { type: mongoose.Schema.Types.ObjectId, ref: "Lead", required: true },
  salesExecutive: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  date: { type: Date, required: true },
  notes: String,
  outcome: String,
  nextFollowUp: Date,
}, { timestamps: true });

module.exports = mongoose.model("FollowUp", followUpSchema);
