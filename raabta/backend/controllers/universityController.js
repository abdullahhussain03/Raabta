const University = require('../models/University');
const UniversityRequest = require('../models/UniversityRequest');
const Community = require('../models/Community');
const { logAudit } = require('../utils/audit');

// Public: powers the signup dropdown. Only ever returns active universities
// — there is no free-text university field on signup.
exports.listActiveUniversities = async (req, res, next) => {
  try {
    const universities = await University.find({ status: 'active' })
      .select('name shortName logoUrl')
      .sort('name');
    res.json({ universities });
  } catch (err) {
    next(err);
  }
};

// Public, unauthenticated lead-capture form. Does NOT create a User and
// does NOT grant any access — purely a signal for admins to onboard a new
// school.
exports.requestUniversity = async (req, res, next) => {
  try {
    const { requesterName, requesterEmail, universityName } = req.body;
    const request = await UniversityRequest.create({ requesterName, requesterEmail, universityName });
    res.status(201).json({ message: 'Thanks! We will review your request.', requestId: request._id });
  } catch (err) {
    next(err);
  }
};

// --- Admin only below ---

exports.adminListUniversities = async (req, res, next) => {
  try {
    const universities = await University.find().sort('-createdAt');
    res.json({ universities });
  } catch (err) {
    next(err);
  }
};

exports.adminCreateUniversity = async (req, res, next) => {
  try {
    const { name, shortName, verifiedEmailDomains, status } = req.body;
    const university = await University.create({
      name,
      shortName,
      verifiedEmailDomains: verifiedEmailDomains.map((d) => d.toLowerCase()),
      status: status === 'active' ? 'active' : 'pending',
    });

    if (university.status === 'active') {
      await activateUniversitySeed(university, req.user._id);
    }

    await logAudit({ action: 'ADMIN_ACTION', actor: req.user._id, req, metadata: { op: 'create_university', universityId: university._id } });

    res.status(201).json({ university });
  } catch (err) {
    next(err);
  }
};

exports.adminUpdateUniversity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, shortName, verifiedEmailDomains, status, logoUrl } = req.body;

    const university = await University.findById(id);
    if (!university) return res.status(404).json({ message: 'University not found' });

    const wasActive = university.status === 'active';

    if (name !== undefined) university.name = name;
    if (shortName !== undefined) university.shortName = shortName;
    if (verifiedEmailDomains !== undefined) {
      university.verifiedEmailDomains = verifiedEmailDomains.map((d) => d.toLowerCase());
    }
    if (logoUrl !== undefined) university.logoUrl = logoUrl;
    if (status !== undefined) university.status = status;

    await university.save();

    // Auto-seed exactly once: the first time a university transitions into
    // 'active'.
    if (!wasActive && university.status === 'active' && !university.hasBeenActivated) {
      await activateUniversitySeed(university, req.user._id);
    }

    await logAudit({ action: 'ADMIN_ACTION', actor: req.user._id, req, metadata: { op: 'update_university', universityId: university._id } });

    res.json({ university });
  } catch (err) {
    next(err);
  }
};

async function activateUniversitySeed(university, adminId) {
  await Community.create({
    name: `${university.shortName || university.name} General`,
    slug: 'general',
    university: university._id,
    type: 'general',
    description: `The main community for all verified students at ${university.name}.`,
    isVerifiedOfficial: true,
    createdBy: adminId,
  });
  university.hasBeenActivated = true;
  await university.save();
  await logAudit({ action: 'UNIVERSITY_ACTIVATED', actor: adminId, targetId: university._id, metadata: {} });
}

exports.adminListUniversityRequests = async (req, res, next) => {
  try {
    const requests = await UniversityRequest.find().sort('-createdAt');
    res.json({ requests });
  } catch (err) {
    next(err);
  }
};

exports.adminUpdateUniversityRequestStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const request = await UniversityRequest.findByIdAndUpdate(id, { status }, { new: true });
    if (!request) return res.status(404).json({ message: 'Request not found' });
    res.json({ request });
  } catch (err) {
    next(err);
  }
};
