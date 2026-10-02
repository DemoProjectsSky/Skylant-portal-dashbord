const mongoose = require("mongoose");

const importExportFileSchema = new mongoose.Schema({
  fileName: { type: String, required: true, trim: true },
  fileType: { type: String, default: "csv", trim: true },
  action: { type: String, enum: ["import", "export"], required: true },
  notes: { type: String, default: "" },
  storagePath: { type: String, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  uploadedByName: { type: String, default: "" },
  uploadedByRole: { type: String, default: "sales_executive" },
  recipientRole: { type: String, enum: ["admin", "manager", "sales_executive"] },
  size: { type: Number, default: 0 },
  status: { type: String, enum: ["draft", "sent"], default: "draft" },
  sentAt: Date,
}, { timestamps: true });

module.exports = mongoose.model("ImportExportFile", importExportFileSchema);
