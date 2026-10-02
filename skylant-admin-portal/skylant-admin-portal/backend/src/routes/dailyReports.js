const express = require("express");
const DailyReport = require("../models/DailyReport");
const User = require("../models/User");
const Lead = require("../models/Lead");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate, authorize("admin", "manager", "sales_executive"));

const today = () => new Date().toISOString().slice(0, 10);
const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);
const toNumber = (value) => Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : null;

function serialize(report, user, status = report?.status || "pending") {
  return {
    id: report?._id || `pending-${user._id}-${report?.date || today()}`,
    salesExecutiveId: user._id,
    salesExecutiveName: user.fullName,
    email: user.email,
    date: report?.date || today(),
    leadsAssigned: report?.leadsAssigned ?? 0,
    callsMade: report?.callsMade ?? 0,
    connected: report?.connected ?? 0,
    interested: report?.interested ?? 0,
    followUps: report?.followUps ?? 0,
    converted: report?.converted ?? 0,
    whatsappConversations: report?.whatsappConversations ?? 0,
    remarks: report?.remarks || "",
    status,
    createdAt: report?.createdAt || null,
    updatedAt: report?.updatedAt || null,
  };
}

function applyFilters(reports, query) {
  const { search, status, salesExecutiveId, from, to } = query;
  return reports.filter((report) => {
    if (status && report.status !== status) return false;
    if (salesExecutiveId && report.salesExecutiveId.toString() !== salesExecutiveId) return false;
    if (from && report.date < from) return false;
    if (to && report.date > to) return false;
    if (search) {
      const needle = search.trim().toLowerCase();
      const searchable = [
        report.salesExecutiveName,
        report.date,
        report.status,
        report.remarks,
        report.leadsAssigned,
        report.callsMade,
        report.connected,
        report.interested,
        report.followUps,
        report.converted,
        report.whatsappConversations,
      ].join(" ").toLowerCase();
      return searchable.includes(needle);
    }
    return true;
  });
}

router.get("/", async (req, res, next) => {
  try {
    const isSales = req.user.role === "sales_executive";
    const users = isSales
      ? [req.user]
      : await User.find({ role: "sales_executive", isActive: true }).select("fullName email isActive").sort("fullName");
    const userIds = users.map((user) => user._id);
    const query = { salesExecutiveId: { $in: userIds } };
    if (req.query.date && validDate(req.query.date)) query.date = req.query.date;
    else if (req.query.from || req.query.to) query.date = {};
    if (req.query.from) query.date.$gte = req.query.from;
    if (req.query.to) query.date.$lte = req.query.to;
    const reports = await DailyReport.find(query).sort({ date: -1, createdAt: -1 }).lean();
    const userMap = new Map(users.map((user) => [user._id.toString(), user]));
    const rows = reports.map((report) => serialize(report, userMap.get(report.salesExecutiveId.toString()), report.status));
    const requestedDate = req.query.date || (req.query.from === req.query.to ? req.query.from : today());
    if (requestedDate && validDate(requestedDate)) {
      users.forEach((user) => {
        if (!reports.some((report) => report.salesExecutiveId.toString() === user._id.toString() && report.date === requestedDate)) {
          rows.push(serialize({ date: requestedDate }, user, "pending"));
        }
      });
    }
    const filtered = applyFilters(rows, req.query).sort((a, b) => b.date.localeCompare(a.date) || a.salesExecutiveName.localeCompare(b.salesExecutiveName));
    const submitted = filtered.filter((row) => row.status !== "pending").length;
    const pending = filtered.filter((row) => row.status === "pending").length;
    res.json({ success: true, data: { reports: filtered, summary: { submitted, pending, totalSalesExecutives: users.length } } });
  } catch (error) { next(error); }
});

router.get("/performance/today", async (req, res, next) => {
  try {
    if (req.user.role !== "sales_executive") return res.status(403).json({ success: false, message: "Sales executive access required" });
    const date = today();
    const report = await DailyReport.findOne({ salesExecutiveId: req.user._id, date }).lean();
    const leadStats = await Lead.aggregate([
      { $match: { assignedTo: req.user._id } },
      { $group: { _id: null, leadsAssigned: { $sum: 1 }, interested: { $sum: { $cond: [{ $eq: ["$status", "INTERESTED"] }, 1, 0] } }, converted: { $sum: { $cond: [{ $eq: ["$status", "CONVERTED"] }, 1, 0] } }, followUps: { $sum: { $cond: [{ $eq: ["$status", "FOLLOW-UP"] }, 1, 0] } } } },
    ]);
    res.json({ success: true, data: { status: report ? "submitted" : "pending", report: report ? serialize(report, req.user, report.status) : null, leadStats: leadStats[0] || { leadsAssigned: 0, interested: 0, converted: 0, followUps: 0 } } });
  } catch (error) { next(error); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const report = await DailyReport.findById(req.params.id).populate("salesExecutiveId", "fullName email role");
    if (!report || (req.user.role === "sales_executive" && report.salesExecutiveId._id.toString() !== req.user._id.toString())) return res.status(404).json({ success: false, message: "Daily report not found" });
    res.json({ success: true, data: serialize(report, report.salesExecutiveId, report.status) });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    if (req.user.role !== "sales_executive") return res.status(403).json({ success: false, message: "Only sales executives can submit daily reports" });
    const date = req.body.date || today();
    if (!validDate(date)) return res.status(400).json({ success: false, message: "Date must use YYYY-MM-DD format" });
    const fields = ["leadsAssigned", "callsMade", "connected", "interested", "followUps", "converted", "whatsappConversations"];
    const values = {};
    for (const field of fields) {
      const value = toNumber(req.body[field]);
      if (value === null) return res.status(400).json({ success: false, message: `${field} must be a non-negative number` });
      values[field] = value;
    }
    const existing = await DailyReport.findOne({ salesExecutiveId: req.user._id, date });
    if (existing) return res.status(409).json({ success: false, message: "A report for this date has already been submitted" });
    const report = await DailyReport.create({ ...values, date, remarks: String(req.body.remarks || "").trim(), salesExecutiveId: req.user._id, status: "submitted" });
    res.status(201).json({ success: true, message: "Daily report submitted", data: serialize(report, req.user, report.status) });
  } catch (error) { next(error); }
});

module.exports = router;
