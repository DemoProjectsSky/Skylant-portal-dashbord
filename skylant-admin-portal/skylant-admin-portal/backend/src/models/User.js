const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["admin", "manager", "sales_executive"], default: "sales_executive" },
  phone: String,
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
