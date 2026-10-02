const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const ImportExportFile = require("../models/ImportExportFile");
const Notification = require("../models/Notification");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);
const uploadDirectory = path.join(__dirname, "../../uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (req, file, callback) => callback(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    if (![".csv", ".xls", ".xlsx"].includes(extension)) return callback(new Error("Only CSV and Excel files are supported"));
    callback(null, true);
  },
});
function handleUpload(req, res, next) {
  upload.single("file")(req, res, (error) => {
    if (error) {
      error.status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
      return next(error);
    }
    next();
  });
}

function mapFile(record) {
  const source = record.toObject ? record.toObject() : record;
  const uploadedBy = source.uploadedBy && typeof source.uploadedBy === "object" ? source.uploadedBy : null;
  return {
    id: source._id,
    fileName: source.fileName,
    fileType: source.fileType,
    action: source.action,
    notes: source.notes || "",
    status: source.status || "draft",
    size: source.size || 0,
    recipientRole: source.recipientRole,
    uploadedByName: source.uploadedByName || uploadedBy?.fullName || "Unknown user",
    uploadedByRole: source.uploadedByRole || uploadedBy?.role || "sales_executive",
    createdAt: source.createdAt,
    sentAt: source.sentAt,
    updatedAt: source.updatedAt,
  };
}

function recipientRoles(role) {
  return role === "admin" || role === "manager" ? ["admin", "manager"] : ["sales_executive"];
}

function canReadFile(record, user) {
  return record.uploadedBy.toString() === user._id.toString() ||
    (record.status === "sent" && recipientRoles(user.role).includes(record.recipientRole));
}

router.get("/inbox/imports", async (req, res, next) => {
  try {
    const data = await ImportExportFile.find({
      action: "import",
      status: "sent",
      storagePath: { $exists: true, $ne: "" },
      recipientRole: { $in: recipientRoles(req.user.role) },
    }).sort({ sentAt: -1, createdAt: -1 });
    res.json({ success: true, data: data.map(mapFile) });
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const files = await ImportExportFile.find({
      storagePath: { $exists: true, $ne: "" },
      $or: [
        { uploadedBy: req.user._id },
        { status: "sent", recipientRole: { $in: recipientRoles(req.user.role) } },
      ],
    }).populate("uploadedBy", "fullName role email").sort({ createdAt: -1 });
    res.json({ success: true, data: files.map(mapFile) });
  } catch (error) {
    next(error);
  }
});

router.post("/upload", handleUpload, async (req, res, next) => {
  try {
    const { action, notes } = req.body ?? {};
    if (!req.file || !["import", "export"].includes(action)) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: "A file and valid action are required", error: "INVALID_FILE_DATA" });
    }

    const record = await ImportExportFile.create({
      fileName: path.basename(req.file.originalname),
      fileType: path.extname(req.file.originalname).slice(1).toLowerCase(),
      action,
      notes: notes || "",
      storagePath: req.file.path,
      size: req.file.size,
      uploadedBy: req.user._id,
      uploadedByName: req.user.fullName,
      uploadedByRole: req.user.role,
      status: "draft",
    });

    res.status(201).json({ success: true, data: mapFile(record) });
  } catch (error) {
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    next(error);
  }
});

router.patch("/:id/send", async (req, res, next) => {
  try {
    const record = await ImportExportFile.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: "File not found", error: "FILE_NOT_FOUND" });
    if (record.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only the person who uploaded this file can send it", error: "FORBIDDEN" });
    }
    if (record.status !== "draft") return res.status(400).json({ success: false, message: "This file has already been sent", error: "FILE_ALREADY_SENT" });

    record.status = "sent";
    record.recipientRole = req.user.role === "admin" || req.user.role === "manager" ? "sales_executive" : "manager";
    record.sentAt = new Date();
    await record.save();
    const targetRoles = record.recipientRole === "manager" ? ["manager", "admin"] : [record.recipientRole];
    const recipients = await User.find({ role: { $in: targetRoles }, isActive: true }).select("_id");
    const navigationPath = record.action === "import"
      ? (record.recipientRole === "sales_executive" ? "/daily-reports" : "/reports")
      : "/excel-export";
    if (recipients.length) {
      await Notification.insertMany(recipients.map((recipient) => ({
        recipient: recipient._id,
        sender: req.user._id,
        type: "shared_file",
        title: "File shared with your team",
        message: `${req.user.fullName} sent ${record.fileName}`,
        entityType: "shared_file",
        entityId: record._id.toString(),
        metadata: { fileName: record.fileName, action: record.action, navigationPath },
      })));
    }
    ActivityLog.create({ user: req.user._id, action: "shared file", module: "files", recordId: record._id.toString(), ip: req.ip, userAgent: req.get("user-agent") })
      .catch((error) => console.error("Unable to record file activity", error));
    res.json({ success: true, data: mapFile(record) });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/download", async (req, res, next) => {
  try {
    const record = await ImportExportFile.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: "File not found", error: "FILE_NOT_FOUND" });
    if (!canReadFile(record, req.user)) return res.status(403).json({ success: false, message: "You do not have access to this file", error: "FORBIDDEN" });
    if (!fs.existsSync(record.storagePath)) return res.status(404).json({ success: false, message: "Stored file is no longer available", error: "FILE_MISSING" });
    res.download(record.storagePath, record.fileName);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const record = await ImportExportFile.findById(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: "File not found", error: "FILE_NOT_FOUND" });
    if (record.uploadedBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only the person who uploaded this file can remove it", error: "FORBIDDEN" });
    }
    if (fs.existsSync(record.storagePath)) fs.unlinkSync(record.storagePath);
    await record.deleteOne();
    res.json({ success: true, message: "File removed", data: { id: req.params.id } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
