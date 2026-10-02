const express = require("express");
const crypto = require("crypto");
const Referral = require("../models/Referral");
const Registration = require("../models/Registration");
const Group = require("../models/Group");
const Lead = require("../models/Lead");
const { College, Program } = require("../models/Catalog");

const router = express.Router();

router.get("/referrals/:code", async (req, res, next) => {
  try {
    const code = String(req.params.code || "").trim().toUpperCase();
    const referral = await Referral.findOne({ referralCode: code, status: "active" })
      .populate("ambassadorId", "fullName email phone")
      .populate("groupId", "groupName collegeName collegeCode city state course program batch ambassador status qualificationTarget")
      .populate("collegeId", "collegeName city")
      .populate("programId", "programName");

    if (!referral) return res.status(404).json({ success: false, message: "This referral link is invalid or inactive", error: "INVALID_REFERRAL" });

    const group = referral.groupId || null;
    const safeProgram = group?.course || group?.program || referral.programId?.programName || "Program";

    res.json({ success: true, data: {
      referralCode: referral.referralCode,
      referralUrl: referral.referralUrl,
      ambassador: referral.ambassadorId ? { id: referral.ambassadorId._id, fullName: referral.ambassadorId.fullName, email: referral.ambassadorId.email, phone: referral.ambassadorId.phone } : null,
      group: group ? { id: group._id, groupName: group.groupName, collegeName: group.collegeName, city: group.city, state: group.state, program: safeProgram, batch: group.batch, status: group.status } : null,
      college: referral.collegeId ? { id: referral.collegeId._id, collegeName: referral.collegeId.collegeName, city: referral.collegeId.city } : (group ? { id: group._id, collegeName: group.collegeName, city: group.city } : null),
      program: referral.programId ? { id: referral.programId._id, programName: referral.programId.programName } : (group ? { id: group._id, programName: safeProgram } : null),
      createdAt: referral.createdAt,
    } });
  } catch (error) { next(error); }
});

router.post("/registrations", async (req, res, next) => {
  try {
    const { referralCode, fullName, mobile, email, whatsappNumber, collegeName, course, graduationYear, programInterested, city, message } = req.body || {};

    if (!referralCode) return res.status(400).json({ success: false, message: "Referral code is required", error: "VALIDATION_ERROR" });
    if (!fullName || !String(fullName).trim()) return res.status(400).json({ success: false, message: "Full name is required", error: "VALIDATION_ERROR" });
    if (!mobile || !/^\+?[0-9\s()-]{7,20}$/.test(String(mobile))) return res.status(400).json({ success: false, message: "Please enter a valid mobile number", error: "VALIDATION_ERROR" });
    if (email && !/^\S+@\S+\.\S+$/.test(String(email))) return res.status(400).json({ success: false, message: "Please enter a valid email address", error: "VALIDATION_ERROR" });

    const normalizedCode = String(referralCode).trim().toUpperCase();
    const referral = await Referral.findOne({ referralCode: normalizedCode, status: "active" })
      .populate("ambassadorId", "fullName email phone")
      .populate("groupId", "groupName collegeName collegeCode city state course program batch status collegeId programId qualificationTarget ambassador");

    if (!referral) return res.status(404).json({ success: false, message: "This referral link is invalid or inactive", error: "INVALID_REFERRAL" });

    const group = referral.groupId;
    if (!group) return res.status(404).json({ success: false, message: "The referred group could not be found", error: "GROUP_NOT_FOUND" });
    if (["Inactive", "Paused", "Completed"].includes(group.status)) return res.status(400).json({ success: false, message: "This referral is no longer active", error: "REFERRAL_INACTIVE" });

    const normalizedMobile = String(mobile).trim();
    const normalizedEmail = email ? String(email).trim().toLowerCase() : "";
    const duplicateRegistration = await Registration.findOne({ $or: [{ email: normalizedEmail || undefined }, { mobile: normalizedMobile }].filter(Boolean) });
    if (duplicateRegistration) return res.status(409).json({ success: false, message: "A registration already exists for this mobile number or email.", error: "DUPLICATE_REGISTRATION" });

    const registration = await Registration.create({
      fullName: String(fullName).trim(),
      email: normalizedEmail,
      mobile: normalizedMobile,
      whatsappNumber: whatsappNumber ? String(whatsappNumber).trim() : undefined,
      collegeName: collegeName || group.collegeName || "",
      collegeId: referral.collegeId || group.collegeId || null,
      course: course || group.course || group.program || "",
      graduationYear: graduationYear ? Number(graduationYear) : undefined,
      programInterested: programInterested || group.course || group.program || "",
      programId: referral.programId || group.programId || null,
      groupId: group._id,
      ambassadorId: referral.ambassadorId?._id || group.ambassadorId || null,
      referralCode: normalizedCode,
      source: "Campus Ambassador Referral",
      status: "New",
      notes: message || "",
      message: message || "",
      city: city || group.city || "",
    });

    const leadDuplicate = await Lead.findOne({ $or: [{ email: normalizedEmail || undefined }, { phone: normalizedMobile }].filter(Boolean) });
    if (!leadDuplicate && (normalizedEmail || normalizedMobile)) {
      await Lead.create({
        name: registration.fullName,
        phone: registration.mobile,
        whatsapp: registration.whatsappNumber,
        email: registration.email,
        college: registration.collegeId || null,
        program: registration.programId || null,
        course: registration.course || registration.programInterested,
        source: "Campus Ambassador Referral",
        referralCode: registration.referralCode,
        campusAmbassador: referral.ambassadorId?.fullName || group.ambassador?.name || "Campus Ambassador",
        status: "NEW",
        createdBy: referral.ambassadorId || group.createdBy || undefined,
        notes: registration.message || registration.notes || "Autosynced from referral registration.",
      });
    }

    res.status(201).json({ success: true, message: "Registration submitted successfully", data: registration });
  } catch (error) { next(error); }
});

module.exports = router;
