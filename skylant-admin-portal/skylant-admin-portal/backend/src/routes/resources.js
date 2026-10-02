const express = require("express");
const { College, Program, Batch, WhatsAppGroup, Campaign, Referral } = require("../models/Catalog");
const Student = require("../models/Student");
const Lead = require("../models/Lead");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router(); router.use(authenticate);
const admin = authorize("admin", "manager");
function crud(model, label, createRoles = ["admin", "manager"]) {
  const route = express.Router();
  route.get("/", async (req, res, next) => { try { const data = await model.find(req.query).sort("-createdAt"); res.json({ success: true, data }); } catch (e) { next(e); } });
  route.get("/:id", async (req, res, next) => { try { const data = await model.findById(req.params.id); if (!data) return res.status(404).json({ success: false, message: `${label} not found`, error: "NOT_FOUND" }); res.json({ success: true, data }); } catch (e) { next(e); } });
  route.post("/", authorize(...createRoles), async (req, res, next) => { try { const data = await model.create({ ...req.body, createdBy: req.user._id }); res.status(201).json({ success: true, message: `${label} created`, data }); } catch (e) { next(e); } });
  route.patch("/:id", admin, async (req, res, next) => { try { const data = await model.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!data) return res.status(404).json({ success: false, message: `${label} not found`, error: "NOT_FOUND" }); res.json({ success: true, message: `${label} updated`, data }); } catch (e) { next(e); } });
  route.delete("/:id", admin, async (req, res, next) => { try { const data = await model.findByIdAndDelete(req.params.id); if (!data) return res.status(404).json({ success: false, message: `${label} not found`, error: "NOT_FOUND" }); res.json({ success: true, message: `${label} deleted` }); } catch (e) { next(e); } });
  return route;
}

router.get("/colleges-overview", async (req, res, next) => {
  try {
    const colleges = await College.find().sort("collegeName");
    const collegeIds = colleges.map((c) => c._id);

    const [leadCounts, campaignCounts] = await Promise.all([
      Lead.aggregate([
        { $match: { college: { $in: collegeIds } } },
        { $group: { _id: "$college", count: { $sum: 1 } } },
      ]),
      Campaign.aggregate([
        { $match: { college: { $in: collegeIds } } },
        { $group: { _id: "$college", count: { $sum: 1 } } },
      ]),
    ]);

    const leadMap = new Map(leadCounts.map((item) => [item._id.toString(), item.count]));
    const campaignMap = new Map(campaignCounts.map((item) => [item._id.toString(), item.count]));

    const data = colleges.map((college) => ({
      id: college._id,
      collegeName: college.collegeName,
      city: college.city,
      status: college.status,
      totalLeads: leadMap.get(college._id.toString()) || 0,
      campaigns: campaignMap.get(college._id.toString()) || 0,
    }));

    res.json({ success: true, data });
  } catch (error) { next(error); }
});

router.use("/colleges", crud(College, "College", ["admin", "manager", "sales_executive"])); router.use("/programs", crud(Program, "Program")); router.use("/batches", crud(Batch, "Batch")); router.use("/whatsapp-groups", crud(WhatsAppGroup, "WhatsApp group")); router.use("/campaigns", crud(Campaign, "Campaign"));
router.use("/students", crud(Student, "Student"));

router.post("/referrals/:code/click", async (req, res, next) => { try { const data = await Referral.findOneAndUpdate({ referralCode: req.params.code }, { $inc: { clicks: 1 } }, { new: true }); if (!data) return res.status(404).json({ success: false, message: "Referral not found", error: "REFERRAL_NOT_FOUND" }); res.json({ success: true, data }); } catch (e) { next(e); } });
router.post("/referrals/:code/lead", async (req, res, next) => { try { const referral = await Referral.findOneAndUpdate({ referralCode: req.params.code }, { $inc: { leads: 1 } }, { new: true }); if (!referral) return res.status(404).json({ success: false, message: "Referral not found", error: "REFERRAL_NOT_FOUND" }); const lead = await Lead.create({ ...req.body, source: "Campaign", createdBy: req.user?._id }); res.status(201).json({ success: true, data: lead }); } catch (e) { next(e); } });
module.exports = router;