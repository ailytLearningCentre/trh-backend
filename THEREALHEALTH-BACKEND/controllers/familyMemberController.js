const FamilyMember = require('../models/FamilyMember');
const service = require('../services/familyMemberService');
const handle = fn => async (req, res) => {
  try { const user = await service.account(req); await fn(req, res, user); }
  catch (error) {
    const status = [400, 401, 403, 404].includes(error.status) ? error.status : 500;
    res.status(status).json({ success: false, message: status === 500 ? 'Unable to manage family members.' : error.message });
  }
};
exports.list = handle(async (req, res, user) => {
  const query = { accountUserId: String(user._id) };
  if (req.query.includeArchived !== 'true') query.isActive = true;
  const members = await FamilyMember.find(query).sort({ createdAt: 1 });
  res.json({ success: true, members: [service.self(user), ...members.map(service.present)], relationships: FamilyMember.relationships, genders: FamilyMember.genders });
});
exports.get = handle(async (req, res, user) => res.json({ success: true, member: await service.resolve(user, req.params.id, { allowArchived: true }) }));
exports.create = handle(async (req, res, user) => {
  const member = await FamilyMember.create({ ...service.validate(req.body), accountUserId: String(user._id) });
  res.status(201).json({ success: true, member: service.present(member) });
});
exports.update = handle(async (req, res, user) => {
  if (req.params.id === 'self') service.fail(403, 'Edit Self through your existing account profile.');
  await service.resolve(user, req.params.id, { allowArchived: true });
  const member = await FamilyMember.findOneAndUpdate({ _id: req.params.id, accountUserId: String(user._id) }, { $set: service.validate(req.body, true) }, { new: true, runValidators: true });
  res.json({ success: true, member: service.present(member) });
});
exports.archive = handle(async (req, res, user) => {
  if (req.params.id === 'self') service.fail(403, 'The Self profile cannot be archived.');
  await service.resolve(user, req.params.id, { allowArchived: true });
  // Keep linked assessments, purchases, payments and appointments intact.
  await FamilyMember.findOneAndUpdate({ _id: req.params.id, accountUserId: String(user._id) }, { $set: { isActive: false, archivedAt: new Date() } });
  res.json({ success: true, message: 'Family member archived. Existing records are preserved.' });
});
