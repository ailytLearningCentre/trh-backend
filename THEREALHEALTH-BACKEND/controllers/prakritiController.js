const Assessment = require('../models/PrakritiAssessment');
const User = require('../models/User');
const family = require('../services/familyMemberService');
const { calculate } = require('../services/prakritiScoringService');
const { report } = require('../services/prakritiReportService');
async function owner(req, res, next) {
  try {
    const token = req.user;
    if (token.registrationOnly) return res.status(401).json({ success: false, message: 'Complete registration first.' });
    const id = token.phone || token._id || token.id;
    const user = id ? await User.findById(id) : token.googleId ? await User.findOne({ googleId: token.googleId }) : null;
    if (!user) return res.status(401).json({ success: false, message: 'Please sign in again.' });
    req.prakritiUserId = user._id;
    req.accountUser = user;
    next();
  } catch (_) { res.status(500).json({ success: false, message: 'Unable to load user.' }); }
}
const handle = fn => async (req, res) => {
  try { await fn(req, res); }
  catch (error) { res.status([400, 401, 403, 404].includes(error.status) ? error.status : 500).json({ success: false, message: [400, 401, 403, 404].includes(error.status) ? error.message : 'Unable to process Prakriti assessment.' }); }
};
const create = handle(async (req, res) => {
  const member = await family.resolve(req.accountUser, req.body?.familyMemberId);
  const result = calculate(req.body?.answers);
  const record = await Assessment.create({ ...result, userId: req.prakritiUserId, familyMemberId: member.id });
  res.status(201).json({ success: true, assessment: report(record) });
});
const latest = handle(async (req, res) => {
  const member = await family.resolve(req.accountUser, req.query.familyMemberId, { allowArchived: true });
  const record = await Assessment.findOne({ userId: req.prakritiUserId, ...family.scope(member.id) }).sort({ completedAt: -1, _id: -1 });
  if (!record) return res.status(404).json({ success: false, message: 'No Prakriti assessment found.' });
  res.json({ success: true, assessment: report(record) });
});
const byId = handle(async (req, res) => {
  if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid assessment ID.' });
  const record = await Assessment.findById(req.params.id);
  if (!record) return res.status(404).json({ success: false, message: 'Assessment not found.' });
  if (String(record.userId) !== String(req.prakritiUserId)) return res.status(403).json({ success: false, message: 'Access denied.' });
  const member = await family.resolve(req.accountUser, req.query.familyMemberId, { allowArchived: true });
  if ((record.familyMemberId || 'self') !== member.id) return res.status(404).json({ success: false, message: 'Assessment not found for this member.' });
  res.json({ success: true, assessment: report(record) });
});
const history = handle(async (req, res) => {
  const member = await family.resolve(req.accountUser, req.query.familyMemberId, { allowArchived: true });
  const records = await Assessment.find({ userId: req.prakritiUserId, ...family.scope(member.id) }).sort({ completedAt: -1, _id: -1 }).limit(100);
  res.json({ success: true, assessments: records.map(report) });
});
module.exports = { owner, create, latest, byId, history };
