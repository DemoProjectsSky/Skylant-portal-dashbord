const express = require("express");
const crypto = require("crypto");
const Referral = require("../models/Referral");
const Group = require("../models/Group");
const Registration = require("../models/Registration");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();
const { referralUrlFor } = require("../config/urls");

function makeReferralCode() {
  return crypto.randomBytes(5).toString("hex").slice(0, 8).toUpperCase();
}

async function buildReferralResponse(referral) {
  const group = referral.groupId ? await Group.findById(referral.groupId).lean() : null;
  const ambassador = referral.ambassadorId ? await referral.populate("ambassadorId", "fullName email phone") : null;
  return {
    _id: referral._id,
    referralCode: referral.referralCode,
    referralUrl: referralUrlFor(referral.referralCode),
    status: referral.status,
    groupName: group?.groupName || null,
    collegeName: group?.collegeName || null,
    program: group?.course || group?.program || null,
    ambassadorName: group?.ambassador?.name || ambassador?.ambassadorId?.fullName || null,
    ambassadorEmail: group?.ambassador?.email || ambassador?.ambassadorId?.email || null,
    ambassadorPhone: group?.ambassador?.mobile || ambassador?.ambassadorId?.phone || null,
    createdAt: referral.createdAt,
  };
}

router.use(authenticate);

router.get("/", authorize("admin", "manager"), async (req, res, next) => {
  try {
    const referrals = await Referral.find().populate("ambassadorId", "fullName email phone").populate("groupId", "groupName collegeName course program ambassador").sort("-createdAt");
    res.json({ success: true, data: referrals.map((referral) => ({
      _id: referral._id,
      referralCode: referral.referralCode,
      referralUrl: referralUrlFor(referral.referralCode),
      status: referral.status,
      ambassadorName: referral.groupId?.ambassador?.name || referral.ambassadorId?.fullName || null,
      groupName: referral.groupId?.groupName || null,
      collegeName: referral.groupId?.collegeName || null,
      program: referral.groupId?.course || referral.groupId?.program || null,
      createdAt: referral.createdAt,
    })) });
  } catch (error) { next(error); }
});

router.post("/", authorize("admin", "manager"), async (req, res, next) => {
  try {
    const { groupId, ambassadorId } = req.body || {};
    if (!groupId) return res.status(400).json({ success: false, message: "Group ID is required", error: "VALIDATION_ERROR" });
    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ success: false, message: "Group not found", error: "GROUP_NOT_FOUND" });
    const assignedAmbassadorId = ambassadorId || group.ambassadorId || group.createdBy;
    let referralCode = makeReferralCode();
    let attempts = 0;
    while (await Referral.exists({ referralCode }) && attempts < 10) { referralCode = makeReferralCode(); attempts += 1; }
    const referral = await Referral.create({
      referralCode,
      referralUrl: referralUrlFor(referralCode),
      ambassadorId: assignedAmbassadorId,
      groupId: group._id,
      collegeId: group.collegeId || null,
      programId: group.programId || null,
      status: "active",
    });
    res.status(201).json({ success: true, message: "Referral link generated", data: await buildReferralResponse(referral) });
  } catch (error) { next(error); }
});

router.get("/:code", authorize("admin", "manager"), async (req, res, next) => {
  try {
    const referral = await Referral.findOne({ referralCode: String(req.params.code).trim().toUpperCase() }).populate("ambassadorId", "fullName email phone").populate("groupId", "groupName collegeName course program ambassador");
    if (!referral) return res.status(404).json({ success: false, message: "Referral code not found", error: "REFERRAL_NOT_FOUND" });
    res.json({ success: true, data: await buildReferralResponse(referral) });
  } catch (error) { next(error); }
});

router.get("/:code/progress", authorize("admin", "manager"), async (req, res, next) => {
  try {
    const referralCode = String(req.params.code).trim().toUpperCase();
    const referral = await Referral.findOne({ referralCode }).populate("groupId", "qualificationTarget groupName collegeName");
    if (!referral) return res.status(404).json({ success: false, message: "Referral code not found", error: "REFERRAL_NOT_FOUND" });
    const registrationCount = await Registration.countDocuments({ referralCode });
    const target = referral.groupId?.qualificationTarget || referral.groupId?.expectedStudents || 30;
    const percentage = target ? Math.min(Math.round((registrationCount / target) * 100), 100) : 0;
    res.json({ success: true, data: { referralCode, registrations: registrationCount, target, progress: percentage, groupName: referral.groupId?.groupName || null, collegeName: referral.groupId?.collegeName || null } });
  } catch (error) { next(error); }
});

module.exports = router;