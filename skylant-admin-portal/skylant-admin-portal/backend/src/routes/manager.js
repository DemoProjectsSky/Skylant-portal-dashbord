const express = require("express");
const User = require("../models/User");
const Lead = require("../models/Lead");
const Group = require("../models/Group");
const Student = require("../models/Student");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate, authorize("admin", "manager"));

router.get("/overview", async (req, res, next) => {
  try {
    const team = await User.find({ role: "sales_executive", isActive: true }).select("fullName email phone isActive");
    const teamIds = team.map((person) => person._id);
    const now = new Date();
    const today = new Date(now);
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const trendStart = new Date(today);
    trendStart.setUTCDate(trendStart.getUTCDate() - 29);
    const currentPeriodStart = new Date(today);
    currentPeriodStart.setUTCDate(currentPeriodStart.getUTCDate() - 29);
    const previousPeriodStart = new Date(currentPeriodStart);
    previousPeriodStart.setUTCDate(previousPeriodStart.getUTCDate() - 30);

    const [recentLeads, totalLeads, statusRows, assignmentRows, trendRows, comparisonRows] = await Promise.all([
      Lead.find().sort("-createdAt").limit(10).populate("assignedTo", "fullName").populate("college", "collegeName").populate("program", "programName"),
      Lead.countDocuments(),
      Lead.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Lead.aggregate([
        { $match: { assignedTo: { $in: teamIds } } },
        { $group: {
          _id: "$assignedTo",
          assignedLeads: { $sum: 1 },
          interested: { $sum: { $cond: [{ $eq: ["$status", "INTERESTED"] }, 1, 0] } },
          followUps: { $sum: { $cond: [{ $eq: ["$status", "FOLLOW-UP"] }, 1, 0] } },
          converted: { $sum: { $cond: [{ $eq: ["$status", "CONVERTED"] }, 1, 0] } },
          callsToday: { $sum: { $cond: [{ $and: [{ $gte: ["$lastContactedDate", today] }, { $lt: ["$lastContactedDate", tomorrow] }] }, 1, 0] } },
          pendingFollowUps: { $sum: { $cond: [{ $and: [{ $ne: ["$followUpDate", null] }, { $lt: ["$followUpDate", now] }, { $not: [{ $in: ["$status", ["CONVERTED", "CLOSED", "LOST"]] }] }] }, 1, 0] } },
        } },
      ]),
      Lead.aggregate([
        { $match: { createdAt: { $gte: trendStart } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Lead.aggregate([
        { $match: { createdAt: { $gte: previousPeriodStart, $lt: tomorrow } } },
        { $group: {
          _id: { period: { $cond: [{ $gte: ["$createdAt", currentPeriodStart] }, "current", "previous"] }, status: "$status" },
          count: { $sum: 1 },
        } },
      ]),
    ]);

    const groups = await Group.find({ createdBy: { $in: teamIds } }).select(
      "groupName collegeName status createdBy expectedStudents"
    );

    const groupCounts = await Student.aggregate([
      { $match: { group: { $in: groups.map((g) => g._id) } } },
      { $group: { _id: "$group", count: { $sum: 1 } } },
    ]);
    const countMap = new Map(groupCounts.map((item) => [item._id.toString(), item.count]));

    const groupsByUser = new Map();
    groups.forEach((group) => {
      const key = group.createdBy.toString();
      const list = groupsByUser.get(key) || [];
      list.push({
        id: group._id,
        groupName: group.groupName,
        collegeName: group.collegeName,
        status: group.status,
        expectedStudents: group.expectedStudents,
        registrations: countMap.get(group._id.toString()) || 0,
      });
      groupsByUser.set(key, list);
    });

    const assignmentMap = new Map(assignmentRows.map((item) => [item._id.toString(), item]));
    const statusCounts = Object.fromEntries(statusRows.map((item) => [item._id || "UNKNOWN", item.count]));
    const periodCounts = { current: {}, previous: {} };
    comparisonRows.forEach((item) => {
      periodCounts[item._id.period][item._id.status || "UNKNOWN"] = item.count;
    });
    const countFor = (period, statuses) => statuses.reduce((sum, status) => sum + (periodCounts[period][status] || 0), 0);
    const comparisons = {
      totalLeads: { current: Object.values(periodCounts.current).reduce((sum, count) => sum + count, 0), previous: Object.values(periodCounts.previous).reduce((sum, count) => sum + count, 0) },
      newLeads: { current: countFor("current", ["NEW"]), previous: countFor("previous", ["NEW"]) },
      interested: { current: countFor("current", ["INTERESTED"]), previous: countFor("previous", ["INTERESTED"]) },
      followUps: { current: countFor("current", ["FOLLOW-UP"]), previous: countFor("previous", ["FOLLOW-UP"]) },
      converted: { current: countFor("current", ["CONVERTED"]), previous: countFor("previous", ["CONVERTED"]) },
      notInterested: { current: countFor("current", ["NOT INTERESTED"]), previous: countFor("previous", ["NOT INTERESTED"]) },
    };

    const mapped = team.map((person) => {
      const metrics = assignmentMap.get(person._id.toString()) || {};
      const personGroups = groupsByUser.get(person._id.toString()) || [];
      return {
        id: person._id,
        full_name: person.fullName,
        email: person.email,
        phone: person.phone,
        is_active: person.isActive,
        assignedLeads: metrics.assignedLeads || 0,
        callsToday: metrics.callsToday || 0,
        interested: metrics.interested || 0,
        followUps: metrics.followUps || 0,
        converted: metrics.converted || 0,
        pendingFollowUps: metrics.pendingFollowUps || 0,
        groups: personGroups,
        totalRegistrations: personGroups.reduce((sum, group) => sum + group.registrations, 0),
      };
    });

    res.json({
      success: true,
      data: {
        summary: { totalLeads, statusCounts, comparisons },
        team: mapped,
        recentLeads: recentLeads.map((lead) => ({
          id: lead._id,
          name: lead.name,
          status: lead.status,
          source: lead.source,
          assignedTo: lead.assignedTo?.fullName || null,
          next_follow_up: lead.followUpDate,
          collegeName: lead.college?.collegeName || null,
          programName: lead.program?.programName || lead.course || null,
          created_at: lead.createdAt,
        })),
        trend: trendRows.map((item) => ({ date: item._id, count: item.count })),
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;