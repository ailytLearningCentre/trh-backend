const FamilyMember = require('../models/FamilyMember');
const User = require('../models/User');
function fail(status, message) { throw Object.assign(new Error(message), { status }); }
async function account(req) {
  const token = req.user;
  if (!token || token.registrationOnly) fail(401, 'Please sign in with a registered account.');
  const id = token.phone || token._id || token.id;
  const user = id ? await User.findById(id) : token.googleId ? await User.findOne({ googleId: token.googleId }) : null;
  if (!user) fail(401, 'Please sign in again.');
  return user;
}
function self(user) {
  return { id: 'self', accountUserId: String(user._id), fullName: user.name || 'Self', relationship: 'Self', dateOfBirth: null, age: user.age ?? null, gender: user.gender || '', profileImage: user.profileImage || '', isSelf: true, isActive: true };
}
function present(member) {
  return { id: String(member._id), accountUserId: String(member.accountUserId), fullName: member.fullName, relationship: member.relationship, dateOfBirth: member.dateOfBirth.toISOString().slice(0, 10), gender: member.gender, profileImage: member.profileImage || '', isSelf: false, isActive: member.isActive };
}
async function resolve(user, id = 'self', { allowArchived = false } = {}) {
  if (id === 'self' || id === undefined) return self(user);
  if (typeof id !== 'string' || !/^[a-f0-9]{24}$/i.test(id)) fail(400, 'Invalid family member.');
  const query = { _id: id, accountUserId: String(user._id) };
  if (!allowArchived) query.isActive = true;
  const member = await FamilyMember.findOne(query);
  if (!member) fail(404, 'Family member not found.');
  return present(member);
}
// Null also matches missing fields in legacy documents: old records belong to Self only.
function scope(id = 'self') { return { familyMemberId: id === 'self' ? { $in: ['self', null] } : id }; }
function validate(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Invalid member details.');
  const output = {};
  for (const key of ['fullName', 'relationship', 'dateOfBirth', 'gender']) {
    if (partial && !Object.hasOwn(body, key)) continue;
    if (typeof body[key] !== 'string') fail(400, 'Name, relationship, date of birth and gender are required.');
    output[key] = body[key].trim();
  }
  if ('fullName' in output && (!output.fullName || output.fullName.length > 100)) fail(400, 'Enter a name of up to 100 characters.');
  if ('relationship' in output && !FamilyMember.relationships.includes(output.relationship)) fail(400, 'Choose a valid relationship. Self is managed through your account profile.');
  if ('gender' in output && !FamilyMember.genders.includes(output.gender)) fail(400, 'Choose a valid gender.');
  if ('dateOfBirth' in output) {
    const raw = output.dateOfBirth;
    const date = new Date(`${raw}T00:00:00.000Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw || date > new Date()) fail(400, 'Enter a valid date of birth that is not in the future.');
    output.dateOfBirth = date;
  }
  if (partial && Object.hasOwn(body, 'isActive')) {
    if (typeof body.isActive !== 'boolean') fail(400, 'Invalid member status.');
    output.isActive = body.isActive;
    output.archivedAt = body.isActive ? null : new Date();
  }
  if (partial && !Object.keys(output).length) fail(400, 'No editable member details supplied.');
  return output;
}
module.exports = { account, self, present, resolve, scope, validate, fail };
