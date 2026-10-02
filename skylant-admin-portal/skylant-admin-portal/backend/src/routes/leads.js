const express = require("express");
const Lead = require("../models/Lead");
const FollowUp = require("../models/FollowUp");
const Student = require("../models/Student");
const User = require("../models/User");
const { College, Program } = require("../models/Catalog");
const ActivityLog = require("../models/ActivityLog");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);
const managerOnly = authorize("admin", "manager");
const visibleFilter = (user) => user.role === "sales_executive" ? { assignedTo: user._id } : {};
const allowedStatuses = ["NEW", "CONTACTED", "INTERESTED", "FOLLOW-UP", "NOT INTERESTED", "CONVERTED", "CLOSED", "LOST"];
function logActivity(req, action, recordId) {
  ActivityLog.create({ user: req.user._id, action, module: "leads", recordId: String(recordId), ip: req.ip, userAgent: req.get("user-agent") })
    .catch((error) => console.error("Unable to record lead activity", error));
}
const serialize = (lead) => ({
  id: lead._id,
  name: lead.name,
  mobile: lead.phone,
  email: lead.email,
  collegeId: lead.college?._id || lead.college || null,
  collegeName: lead.college?.collegeName || null,
  programId: lead.program?._id || lead.program || null,
  programName: lead.program?.programName || lead.course || null,
  source: lead.source,
  campaignId: lead.campaign?._id || lead.campaign || null,
  campaignName: lead.campaign?.name || null,
  campaignCode: lead.campaignCode,
  campusAmbassador: lead.campusAmbassador,
  referralCode: lead.referralCode,
  assignedTo: lead.assignedTo?._id || lead.assignedTo || null,
  assignedToName: lead.assignedTo?.fullName || null,
  status: lead.status,
  nextFollowUp: lead.followUpDate,
  lastContact: lead.lastContactedDate,
  remarks: lead.notes,
  createdAt: lead.createdAt,
  updatedAt: lead.updatedAt,
});

async function resolveId(value, Model, field) {
  if (!value) return null;
  if (/^[0-9a-fA-F]{24}$/.test(value)) return value;
  const record = await Model.findOne({ [field]: new RegExp(`^${String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }).select("_id");
  return record?._id || null;
}

router.get("/", async (req, res, next) => {
  try {
    const { page = 1, limit = 100, search, status, college, program, assignedExecutive, source, campaign, dateFrom, dateTo, sort = "-createdAt" } = req.query;
    const filter = { ...visibleFilter(req.user) };
    if (search) {
      const [collegeRecord, programRecord] = await Promise.all([resolveId(search, College, "collegeName"), resolveId(search, Program, "programName")]);
      filter.$or = [{ name: new RegExp(search, "i") }, { phone: new RegExp(search, "i") }, { email: new RegExp(search, "i") }, ...(collegeRecord ? [{ college: collegeRecord }] : []), ...(programRecord ? [{ program: programRecord }] : [])];
    }
    if (status) filter.status = status;
    if (college) filter.college = await resolveId(college, College, "collegeName") || college;
    if (program) filter.program = await resolveId(program, Program, "programName") || program;
    if (assignedExecutive) filter.assignedTo = assignedExecutive;
    if (source) filter.source = source;
    if (campaign) filter.$or = [...(filter.$or || []), { campaign: campaign }, { campaignCode: new RegExp(campaign, "i") }];
    if (dateFrom || dateTo) filter.createdAt = { ...(dateFrom ? { $gte: new Date(dateFrom) } : {}), ...(dateTo ? { $lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}) };
    const query = Lead.find(filter).populate("assignedTo", "fullName email").populate("college", "collegeName city").populate("program", "programName").populate("campaign", "name").sort(sort).skip((page - 1) * Number(limit)).limit(Number(limit));
    const [leads, total, statusCounts] = await Promise.all([query, Lead.countDocuments(filter), Lead.aggregate([{ $match: filter }, { $group: { _id: "$status", count: { $sum: 1 } } }])]);
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); weekStart.setHours(0, 0, 0, 0);
    const [newThisWeek, pendingFollowUps] = await Promise.all([Lead.countDocuments({ ...filter, createdAt: { $gte: weekStart } }), Lead.countDocuments({ ...filter, followUpDate: { $gte: new Date() }, status: "FOLLOW-UP" })]);
    const counts = Object.fromEntries(statusCounts.map((item) => [item._id, item.count]));
    res.json({ success: true, data: { data: leads.map(serialize), stats: { total, newThisWeek, converted: counts.CONVERTED || 0, conversionRate: total ? Math.round(((counts.CONVERTED || 0) / total) * 100) : 0, pendingFollowUps, statusCounts: counts }, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } } });
  } catch (error) { next(error); }
});

router.get("/assigned/me", async (req, res, next) => {
  try {
    const data = await Lead.find({ assignedTo: req.user._id }).sort("-createdAt");
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

router.get("/follow-ups", async (req, res, next) => {
  try {
    const filter = req.user.role === "sales_executive" ? { salesExecutive: req.user._id } : {};
    const data = await FollowUp.find(filter)
      .populate({ path: "lead", select: "name phone college course program status followUpDate assignedTo", populate: [{ path: "college", select: "collegeName" }, { path: "program", select: "programName" }, { path: "assignedTo", select: "fullName" }] })
      .populate("salesExecutive", "fullName email")
      .sort({ date: -1 })
      .limit(Math.min(Number(req.query.limit) || 500, 1000));
    res.json({ success: true, data: data.map((item) => ({
      id: item._id,
      leadId: item.lead?._id,
      leadName: item.lead?.name || "Deleted lead",
      collegeName: item.lead?.college?.collegeName || "-",
      assignedToName: item.lead?.assignedTo?.fullName || item.salesExecutive?.fullName || "-",
      salesExecutiveName: item.salesExecutive?.fullName || "-",
      date: item.date,
      nextFollowUp: item.nextFollowUp || item.lead?.followUpDate || null,
      notes: item.notes || "",
      outcome: item.outcome || "-",
      leadStatus: item.lead?.status || "-",
    })) });
  } catch (error) { next(error); }
});

router.post("/", async (req, res, next) => {
  try {
    const { name, phone, whatsapp, email } = req.body;
    if (!name?.trim() || !/^\+?[0-9\s()-]{7,20}$/.test(String(phone || ""))) return res.status(400).json({ success: false, message: "Name and a valid mobile number are required", error: "VALIDATION_ERROR" });
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ success: false, message: "Please enter a valid email address", error: "VALIDATION_ERROR" });
    const duplicate = await Lead.findOne({ $or: [{ phone: phone || null }, { whatsapp: whatsapp || null }, { email: email?.toLowerCase() || null }].filter((item) => Object.values(item)[0]) });
    if (duplicate) return res.status(409).json({ success: false, message: "A matching lead already exists", error: "DUPLICATE_LEAD", existingLeadId: duplicate._id });
    let assignedTo = req.user.role === "sales_executive" ? req.user._id : req.body.assignedTo;
    if (assignedTo) { const assignee = await User.findOne({ _id: assignedTo, role: "sales_executive", isActive: true }); if (!assignee) return res.status(400).json({ success: false, message: "Assigned sales executive is invalid" }); }
    const payload = { ...req.body, phone, email: email?.toLowerCase(), notes: req.body.remarks ?? req.body.notes, createdBy: req.user._id, assignedTo };
    ["college", "program", "campaign", "assignedTo", "followUpDate"].forEach((field) => { if (payload[field] === "") delete payload[field]; });
    const lead = await Lead.create({ ...payload, assignedTo });
    logActivity(req, "created", lead._id);
    const populated = await lead.populate([{ path: "assignedTo", select: "fullName email" }, { path: "college", select: "collegeName city" }, { path: "program", select: "programName" }, { path: "campaign", select: "name" }]);
    res.status(201).json({ success: true, message: "Lead created successfully", data: serialize(populated) });
  } catch (error) { next(error); }
});

router.get("/:id", async (req, res, next) => {
  try { const lead = await Lead.findOne({ _id: req.params.id, ...visibleFilter(req.user) }).populate("assignedTo", "fullName email").populate("college", "collegeName city").populate("program", "programName").populate("campaign", "name"); if (!lead) return res.status(404).json({ success: false, message: "Lead not found", error: "LEAD_NOT_FOUND" }); res.json({ success: true, data: serialize(lead) }); } catch (error) { next(error); }
});
router.patch("/:id", async (req, res, next) => {
  try {
    const allowed = req.user.role === "sales_executive" ? ["status", "followUpDate", "lastContactedDate", "notes"] : ["assignedTo", "status", "followUpDate", "lastContactedDate", "notes", "source", "campaign", "campaignCode"];
    const requestUpdates = { ...req.body };
    if (requestUpdates.next_follow_up !== undefined && requestUpdates.followUpDate === undefined) requestUpdates.followUpDate = requestUpdates.next_follow_up;
    if (requestUpdates.last_contact !== undefined && requestUpdates.lastContactedDate === undefined) requestUpdates.lastContactedDate = requestUpdates.last_contact;
    const updates = Object.fromEntries(Object.entries(requestUpdates).filter(([key]) => allowed.includes(key)));
    if (updates.status && !allowedStatuses.includes(updates.status)) return res.status(400).json({ success: false, message: "Invalid lead status" });
    if (updates.assignedTo) { const assignee = await User.findOne({ _id: updates.assignedTo, role: "sales_executive", isActive: true }); if (!assignee) return res.status(400).json({ success: false, message: "Assigned sales executive is invalid" }); }
    const lead = await Lead.findOneAndUpdate({ _id: req.params.id, ...visibleFilter(req.user) }, { $set: updates }, { new: true, runValidators: true }).populate("assignedTo", "fullName email").populate("college", "collegeName city").populate("program", "programName").populate("campaign", "name");
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found", error: "LEAD_NOT_FOUND" }); logActivity(req, "updated", lead._id); res.json({ success: true, message: "Lead updated successfully", data: serialize(lead) });
  } catch (error) { next(error); }
});
router.delete("/:id", managerOnly, async (req, res, next) => { try { const lead = await Lead.findByIdAndDelete(req.params.id); if (!lead) return res.status(404).json({ success: false, message: "Lead not found", error: "LEAD_NOT_FOUND" }); logActivity(req, "deleted", lead._id); res.json({ success: true, message: "Lead deleted successfully" }); } catch (error) { next(error); } });

router.post("/:leadId/followups", async (req, res, next) => { try { const lead = await Lead.findOne({ _id: req.params.leadId, ...visibleFilter(req.user) }); if (!lead) return res.status(404).json({ success: false, message: "Lead not found", error: "LEAD_NOT_FOUND" }); const { date, notes, outcome, nextFollowUp } = req.body ?? {}; if (!String(notes || "").trim()) return res.status(400).json({ success: false, message: "Follow-up notes are required", error: "VALIDATION_ERROR" }); const followUp = await FollowUp.create({ lead: lead._id, salesExecutive: req.user._id, date: date ? new Date(date) : new Date(), notes: String(notes).trim(), outcome: String(outcome || "").trim(), ...(nextFollowUp ? { nextFollowUp: new Date(nextFollowUp) } : {}) }); await Lead.findByIdAndUpdate(lead._id, { ...(nextFollowUp ? { followUpDate: new Date(nextFollowUp) } : {}), status: "FOLLOW-UP" }); logActivity(req, "added follow-up notes", lead._id); res.status(201).json({ success: true, message: "Follow-up notes saved", data: followUp }); } catch (error) { next(error); } });
router.get("/:leadId/followups", async (req, res, next) => { try { const data = await FollowUp.find({ lead: req.params.leadId, ...(req.user.role === "sales_executive" ? { salesExecutive: req.user._id } : {}) }).sort("-date"); res.json({ success: true, data }); } catch (error) { next(error); } });
router.post("/:id/convert", managerOnly, async (req, res, next) => { try { const lead = await Lead.findById(req.params.id); if (!lead) return res.status(404).json({ success: false, message: "Lead not found", error: "LEAD_NOT_FOUND" }); const student = await Student.create({ ...req.body, fullName: req.body.fullName || lead.name, email: req.body.email || lead.email, phone: req.body.phone || lead.phone, convertedFromLead: lead._id, assignedCounselor: lead.assignedTo }); lead.status = "CONVERTED"; await lead.save(); res.status(201).json({ success: true, message: "Lead converted to student", data: student }); } catch (error) { next(error); } });

module.exports = router;
