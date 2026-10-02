const express = require("express");
const AttendanceSession = require("../models/AttendanceSession");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate, authorize("admin", "manager"));

router.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const sessions = await AttendanceSession.find()
      .populate({ path: "user", match: { role: "sales_executive" }, select: "fullName email role" })
      .sort({ loginAt: -1 })
      .limit(limit)
      .lean();
    res.json({
      success: true,
      data: sessions.filter((session) => session.user).map((session) => ({
        id: session._id,
        employeeName: session.user.fullName,
        email: session.user.email,
        loginAt: session.loginAt,
        logoutAt: session.logoutAt || null,
      })),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
