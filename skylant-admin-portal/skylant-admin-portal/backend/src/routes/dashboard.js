const express = require("express");
const Lead = require("../models/Lead");
const Student = require("../models/Student");
const { College, Program, Batch } = require("../models/Catalog");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
router.get("/summary", authenticate, async (req, res, next) => {
  try {
    const scope = req.user.role === "sales_executive" ? { assignedTo: req.user._id } : {};
    const [leads, totalStudents, activeStudents, colleges, programs, batches, statusBreakdown, sourceBreakdown] = await Promise.all([
      Lead.countDocuments(scope), Student.countDocuments(), Student.countDocuments({ trainingStatus: { $in: ["Active", "Training", "Internship"] } }), College.countDocuments(), Program.countDocuments(), Batch.countDocuments(), Lead.aggregate([{ $match: scope }, { $group: { _id: "$status", count: { $sum: 1 } } }]), Lead.aggregate([{ $match: scope }, { $group: { _id: "$source", count: { $sum: 1 } } }]),
    ]);
    const today = new Date(); today.setHours(0, 0, 0, 0); const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    const [followUpsToday, overdueFollowUps] = await Promise.all([Lead.countDocuments({ ...scope, followUpDate: { $gte: today, $lt: tomorrow } }), Lead.countDocuments({ ...scope, followUpDate: { $lt: today }, status: { $nin: ["CONVERTED", "CLOSED", "LOST"] } })]);
    const byStatus = Object.fromEntries(statusBreakdown.map((item) => [item._id || "UNKNOWN", item.count]));
    res.json({ success: true, data: { totalLeads: leads, newLeads: byStatus.NEW || 0, interestedLeads: byStatus.INTERESTED || 0, followUps: byStatus["FOLLOW-UP"] || 0, convertedLeads: byStatus.CONVERTED || 0, lostLeads: (byStatus.LOST || 0) + (byStatus["NOT INTERESTED"] || 0), totalStudents, activeStudents, totalColleges: colleges, totalPrograms: programs, totalBatches: batches, followUpsToday, overdueFollowUps, leadsByStatus: byStatus, leadsBySource: Object.fromEntries(sourceBreakdown.map((item) => [item._id || "UNKNOWN", item.count])) } });
  } catch (error) { next(error); }
});
module.exports = router;
