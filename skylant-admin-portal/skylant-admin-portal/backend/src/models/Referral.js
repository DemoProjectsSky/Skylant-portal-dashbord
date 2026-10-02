const mongoose = require("mongoose");

if (mongoose.models.Referral) {
  module.exports = mongoose.models.Referral;
} else {
  const referralSchema = new mongoose.Schema({
    referralCode: { type: String, required: true, unique: true, trim: true, uppercase: true, index: true },
    referralUrl: { type: String, required: true },
    ambassadorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: "Group", default: null },
    collegeId: { type: mongoose.Schema.Types.ObjectId, ref: "College", default: null },
    programId: { type: mongoose.Schema.Types.ObjectId, ref: "Program", default: null },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
    createdAt: { type: Date, default: Date.now },
  }, { timestamps: true });

  module.exports = mongoose.model("Referral", referralSchema);
}
