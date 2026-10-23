const express = require("express");
const crypto = require("crypto");
const Group = require("../models/Group");
const Student = require("../models/Student");
const Registration = require("../models/Registration");
const Lead = require("../models/Lead");
const User = require("../models/User");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
const managerOrSales = authorize("admin", "manager", "sales_executive");
const { referralUrlFor } = require("../config/urls");
const toGroupResponse = (group, registrations) => ({ ...group.toObject(), registrations, progress: group.expectedStudents ? Math.min(Math.round((registrations / group.expectedStudents) * 100), 100) : 0, referralLink: referralUrlFor(group.referralCode) });

router.get("/", authenticate, managerOrSales, async (req, res, next) => {
  try {
    const { search, salesMember, program, course, status, date } = req.query;
    const filter = req.user.role === "sales_executive" ? { createdBy: req.user._id } : {};
    if (salesMember) filter.createdBy = salesMember;
    if (program && program !== "All") filter.program = program;
    if (course && course !== "All") filter.course = course;
    if (status && status !== "All") filter.status = status;
    if (search) filter.$or = [{ groupName: new RegExp(search, "i") }, { collegeName: new RegExp(search, "i") }, { "ambassador.name": new RegExp(search, "i") }];
    if (date === "Today") { const start = new Date(); start.setHours(0, 0, 0, 0); filter.createdAt = { $gte: start }; }
    if (date === "This Week") { const start = new Date(); start.setDate(start.getDate() - start.getDay()); start.setHours(0, 0, 0, 0); filter.createdAt = { $gte: start }; }
    if (date === "This Month") { const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0); filter.createdAt = { $gte: start }; }
    const groups = await Group.find(filter).populate("createdBy", "fullName email").sort("-createdAt");
    const counts = await Registration.aggregate([{ $match: { groupId: { $in: groups.map((group) => group._id) } } }, { $group: { _id: "$groupId", count: { $sum: 1 } } }]);
    const countMap = new Map(counts.map((item) => [item._id.toString(), item.count]));
    res.json({ success: true, data: groups.map((group) => toGroupResponse(group, countMap.get(group._id.toString()) || 0)) });
  } catch (error) { next(error); }
});

router.get("/team-members", authenticate, managerOrSales, async (req, res, next) => {
  try {
    const filter = req.user.role === "sales_executive" ? { _id: req.user._id } : { role: "sales_executive", isActive: true };
    const data = await User.find(filter).select("_id fullName email").sort("fullName");
    res.json({ success: true, data });
  } catch (error) { next(error); }
});

router.post("/", authenticate, managerOrSales, async (req, res, next) => {
  try {
    const required = ["groupName", "collegeName", "ambassador", "program", "course", "batch", "mode", "expectedStudents"];
    if (required.some((field) => req.body[field] === undefined || req.body[field] === "")) return res.status(400).json({ success: false, message: "Please complete all required group fields", error: "VALIDATION_ERROR" });
    const group = await Group.create({
      ...req.body,
      createdBy: req.user._id,
      ambassadorId: req.body.ambassadorId || req.user._id,
      referralCode: `SKY-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
      qualificationTarget: Number(req.body.qualificationTarget || req.body.expectedStudents || 30),
    });
    const populated = await group.populate("createdBy", "fullName email");
    res.status(201).json({ success: true, message: "Group created successfully", data: toGroupResponse(populated, 0) });
  } catch (error) { next(error); }
});

router.patch("/:id", authenticate, managerOrSales, async (req, res, next) => {
  try {
    const filter = req.user.role === "sales_executive" ? { _id: req.params.id, createdBy: req.user._id } : { _id: req.params.id };
    const update = { ...req.body };
    if (req.body.qualificationTarget) update.qualificationTarget = Number(req.body.qualificationTarget);
    const group = await Group.findOneAndUpdate(filter, update, { new: true, runValidators: true }).populate("createdBy", "fullName email");
    if (!group) return res.status(404).json({ success: false, message: "Group not found", error: "GROUP_NOT_FOUND" });
    const registrations = await Registration.countDocuments({ groupId: group._id });
    res.json({ success: true, message: "Group updated successfully", data: toGroupResponse(group, registrations) });
  } catch (error) { next(error); }
});

router.post("/:id/regenerate-link", authenticate, managerOrSales, async (req, res, next) => {
  try {
    const filter = req.user.role === "sales_executive" ? { _id: req.params.id, createdBy: req.user._id } : { _id: req.params.id };
    const group = await Group.findOneAndUpdate(filter, { referralCode: `SKY-${crypto.randomBytes(4).toString("hex").toUpperCase()}` }, { new: true }).populate("createdBy", "fullName email");
    if (!group) return res.status(404).json({ success: false, message: "Group not found", error: "GROUP_NOT_FOUND" });
    const registrations = await Registration.countDocuments({ groupId: group._id });
    res.json({ success: true, message: "Referral link regenerated", data: toGroupResponse(group, registrations) });
  } catch (error) { next(error); }
});

router.delete("/:id", authenticate, managerOrSales, async (req, res, next) => {
  try {
    const filter = req.user.role === "sales_executive" ? { _id: req.params.id, createdBy: req.user._id } : { _id: req.params.id };
    const group = await Group.findOneAndDelete(filter);
    if (!group) return res.status(404).json({ success: false, message: "Group not found", error: "GROUP_NOT_FOUND" });
    res.json({ success: true, message: "Group deleted successfully" });
  } catch (error) { next(error); }
});

router.get("/:id/registrations", authenticate, managerOrSales, async (req, res, next) => {
  try {
    const data = await Registration.find({ groupId: req.params.id }).populate("ambassadorId", "fullName email").sort("-createdAt");
    res.json({ success: true, data: data.map((item) => ({
      _id: item._id,
      fullName: item.fullName,
      name: item.fullName,
      email: item.email,
      phone: item.mobile,
      mobile: item.mobile,
      collegeName: item.collegeName,
      program: item.programInterested || item.course,
      ambassadorName: item.ambassadorId?.fullName || "",
      referralCode: item.referralCode,
      status: item.status,
      createdAt: item.createdAt,
    })) });
  } catch (error) { next(error); }
});

router.post("/:id/register", async (req, res, next) => {
  try {
    const group = await Group.findOne({ $or: [{ _id: req.params.id }, { referralCode: req.params.id }] });
    if (!group) return res.status(404).json({ success: false, message: "Registration group not found", error: "GROUP_NOT_FOUND" });
    const existing = await Student.findOne({ group: group._id, $or: [{ email: req.body.email }, { phone: req.body.phone }] });
    if (existing) return res.status(409).json({ success: false, message: "This student is already registered for the group", error: "DUPLICATE_REGISTRATION" });
    const { program, ...registrationData } = req.body;
    const fullName = req.body.fullName || req.body.name;
    const student = await Student.create({ ...registrationData, fullName, group: group._id, joiningDate: new Date() });
    const duplicateConditions = [{ email: req.body.email?.toLowerCase() }, { phone: req.body.phone }].filter((item) => Object.values(item)[0]);
    const duplicate = duplicateConditions.length ? await Lead.findOne({ $or: duplicateConditions }) : null;
    if (!duplicate && (req.body.email || req.body.phone)) {
      await Lead.create({ name: fullName, email: req.body.email?.toLowerCase(), phone: req.body.phone, source: "Campus Ambassador", referralCode: group.referralCode, notes: `Registration from ${group.groupName}`, createdBy: group.createdBy });
    }
    res.status(201).json({ success: true, message: "Registration submitted successfully", data: student });
  } catch (error) { next(error); }
});

module.exports = router;