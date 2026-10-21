const express = require("express");
const { rateLimit } = require("express-rate-limit");
const crypto = require("crypto");
const Referral = require("../models/Referral");
const Registration = require("../models/Registration");
const Group = require("../models/Group");
const Lead = require("../models/Lead");
const { College, Program } = require("../models/Catalog");

const router = express.Router();
const configuredPortalBaseUrl = (process.env.PORTAL_URL || process.env.CLIENT_URL?.split(",")[0] || "http://localhost:5173").trim();
const portalBaseUrl = (/^https?:\/\//i.test(configuredPortalBaseUrl) ? configuredPortalBaseUrl : `https://${configuredPortalBaseUrl}`).replace(/\/+$/, "");
const websiteLeadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/leads", websiteLeadLimiter, async (req, res, next) => {
  try {
    const { name, phone, email, college, year, program, website } = req.body || {};

    if (website) return res.status(201).json({ success: true });

    const normalizedName = String(name || "").trim();
    const normalizedPhone = String(phone || "").trim();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const collegeName = String(college || "").trim();
    const yearOfStudy = String(year || "").trim();
    const course = String(program || "").trim();
    const validStudyYears = ["1st Year", "2nd Year", "3rd Year", "4th Year", "Graduate"];

    if (!normalizedName || normalizedName.length > 100) {
      return res.status(400).json({ success: false, message: "Please enter a valid name.", error: "VALIDATION_ERROR" });
    }
    if (!/^[6-9][0-9]{9}$/.test(normalizedPhone)) {
      return res.status(400).json({ success: false, message: "Please enter a valid 10-digit mobile number.", error: "VALIDATION_ERROR" });
    }
    if (normalizedEmail.length > 254 || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email address.", error: "VALIDATION_ERROR" });
    }
    if (!collegeName || collegeName.length > 150 || !validStudyYears.includes(yearOfStudy) || !course || course.length > 150) {
      return res.status(400).json({ success: false, message: "Please complete all education details.", error: "VALIDATION_ERROR" });
    }

    const duplicate = await Lead.findOne({ $or: [{ phone: normalizedPhone }, { email: normalizedEmail }] });
    if (duplicate) {
      return res.status(409).json({ success: false, message: "A lead with this mobile number or email already exists.", error: "DUPLICATE_LEAD" });
    }

    const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const [collegeRecord, programRecord] = await Promise.all([
      College.findOne({ collegeName: new RegExp(`^${escapeRegex(collegeName)}$`, "i") }).select("_id"),
      Program.findOne({ programName: new RegExp(`^${escapeRegex(course)}$`, "i") }).select("_id"),
    ]);

    const lead = await Lead.create({
      name: normalizedName,
      phone: normalizedPhone,
      email: normalizedEmail,
      college: collegeRecord?._id || undefined,
      collegeName,
      course,
      program: programRecord?._id || undefined,
      yearOfStudy,
      source: "Website",
      status: "NEW",
    });

    res.status(201).json({ success: true, message: "Lead submitted successfully", data: { id: lead._id } });
  } catch (error) {
    next(error);
  }
});

router.get("/referrals/:code", async (req, res, next) => {
  try {
    const code = String(req.params.code || "").trim().toUpperCase();
    const referral = await Referral.findOne({ referralCode: code, status: "active" })
      .populate("ambassadorId", "fullName email phone")
      .populate("groupId", "groupName collegeName collegeCode city state course program batch ambassador status qualificationTarget")
      .populate("collegeId", "collegeName city")
      .populate("programId", "programName");

    if (!referral) {
      const group = await Group.findOne({ referralCode: code });
      if (!group || ["Inactive", "Paused", "Completed"].includes(group.status)) {
        return res.status(404).json({ success: false, message: "This referral link is invalid or inactive", error: "INVALID_REFERRAL" });
      }

      const groupProgram = group.course || group.program || "Program";
      return res.json({ success: true, data: {
        referralCode: group.referralCode,
        referralUrl: `${portalBaseUrl}/r/${group.referralCode}`,
        ambassador: group.ambassador ? {
          id: group.ambassadorId,
          fullName: group.ambassador.name,
          email: group.ambassador.email,
          phone: group.ambassador.mobile,
        } : null,
        group: { id: group._id, groupName: group.groupName, collegeName: group.collegeName, city: group.city, state: group.state, program: groupProgram, batch: group.batch, status: group.status },
        college: { id: group.collegeId, collegeName: group.collegeName, city: group.city },
        program: { id: group.programId, programName: groupProgram },
        createdAt: group.createdAt,
      } });
    }

    const group = referral.groupId || null;
    const safeProgram = group?.course || group?.program || referral.programId?.programName || "Program";

    res.json({ success: true, data: {
      referralCode: referral.referralCode,
      referralUrl: referral.referralUrl,
      ambassador: referral.groupId?.ambassador ? {
        id: referral.ambassadorId?._id,
        fullName: referral.groupId.ambassador.name,
        email: referral.groupId.ambassador.email,
        phone: referral.groupId.ambassador.mobile,
      } : referral.ambassadorId ? { id: referral.ambassadorId._id, fullName: referral.ambassadorId.fullName, email: referral.ambassadorId.email, phone: referral.ambassadorId.phone } : null,
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

    const group = referral ? referral.groupId : await Group.findOne({ referralCode: normalizedCode });
    if (!group) {
      const error = referral ? "GROUP_NOT_FOUND" : "INVALID_REFERRAL";
      const message = referral ? "The referred group could not be found" : "This referral link is invalid or inactive";
      return res.status(404).json({ success: false, message, error });
    }

    if (["Inactive", "Paused", "Completed"].includes(group.status)) return res.status(400).json({ success: false, message: "This referral is no longer active", error: "REFERRAL_INACTIVE" });
    const ambassadorUserId = referral?.ambassadorId?._id || referral?.ambassadorId || group.ambassadorId || undefined;
    const collegeId = referral?.collegeId || group.collegeId;
    const programId = referral?.programId || group.programId;

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
      collegeId: collegeId || null,
      course: course || group.course || group.program || "",
      graduationYear: graduationYear ? Number(graduationYear) : undefined,
      programInterested: programInterested || group.course || group.program || "",
      programId: programId || null,
      groupId: group._id,
      ambassadorId: ambassadorUserId || null,
      referralCode: normalizedCode,
      source: "Campus Ambassador Referral",
      status: "New",
      notes: message || "",
      message: message || "",
      city: city || group.city || "",
    });

    const leadQuery = {
      $or: [
        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
        { phone: normalizedMobile },
      ],
    };
    const leadDuplicate = await Lead.findOne(leadQuery);
    const leadFields = {
      name: registration.fullName,
      phone: registration.mobile,
      whatsapp: registration.whatsappNumber,
      email: registration.email,
      college: registration.collegeId || undefined,
      collegeName: registration.collegeName,
      program: registration.programId || undefined,
      course: registration.course || registration.programInterested,
      graduationYear: registration.graduationYear,
      city: registration.city,
      source: "Campus Ambassador",
      referralCode: registration.referralCode,
      campusAmbassador: group.ambassador?.name || referral?.ambassadorId?.fullName || "Campus Ambassador",
      notes: registration.message || registration.notes || leadDuplicate?.notes || "Autosynced from referral registration.",
    };

    if (leadDuplicate) {
      await Lead.updateOne({ _id: leadDuplicate._id }, { $set: leadFields }, { runValidators: true });
    } else {
      await Lead.create({
        ...leadFields,
        status: "NEW",
        createdBy: ambassadorUserId || group.createdBy || undefined,
      });
    }

    res.status(201).json({ success: true, message: "Registration submitted successfully", data: registration });
  } catch (error) { next(error); }
});

module.exports = router;
