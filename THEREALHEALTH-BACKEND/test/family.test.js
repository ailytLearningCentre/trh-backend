const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
process.env.JWT_SECRET = 'family-test-jwt';
process.env.RAZORPAY_KEY_ID = 'family-test-key';
process.env.RAZORPAY_KEY_SECRET = 'family-test-secret';
const jwt = require('jsonwebtoken');
const express = require('express');
const Family = require('../models/FamilyMember');
const Assessment = require('../models/PrakritiAssessment');
const Purchase = require('../models/WellnessPurchase');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const Availability = require('../models/DoctorAvailability');
const provider = require('../services/wellnessPaymentService');
const { questionIds } = require('../services/prakritiScoringService');
const service = require('../services/familyMemberService');
function matches(doc, query) {
  return Object.entries(query).every(([key, value]) => {
    if (key === '$or') return value.some(v => matches(doc, v));
    if (value && typeof value === 'object' && '$in' in value) return value.$in.some(v => v === null ? doc[key] == null : String(doc[key]) === String(v));
    if (value && typeof value === 'object' && '$ne' in value) return doc[key] !== value.$ne;
    return String(doc[key]) === String(value);
  });
}
class Query {
  constructor(fn, one = false) { this.fn = fn; this.one = one; this.reverse = false; this.max = Infinity; }
  sort(value) { this.reverse = Object.values(value)[0] === -1; return this; }
  select() { return this; }
  limit(value) { this.max = value; return this; }
  then(resolve, reject) { let rows = [...this.fn()]; if (this.reverse) rows.reverse(); rows = rows.slice(0, this.max); return Promise.resolve(this.one ? rows[0] || null : rows).then(resolve, reject); }
}
function memory(Model) {
  const rows = [];
  Model.find = q => new Query(() => rows.filter(p => matches(p, q)));
  Model.findOne = q => new Query(() => rows.filter(p => matches(p, q)), true);
  Model.findById = async id => rows.find(p => String(p._id) === String(id)) || null;
  Model.countDocuments = async q => rows.filter(p => matches(p, q)).length;
  Model.create = async data => { const p = new Model(data); await p.validate(); p.save = async () => { await p.validate(); return p; }; rows.push(p); return p; };
  Model.findOneAndUpdate = async (q, update) => { const p = rows.find(p => matches(p, q)); if (!p) return null; Object.assign(p, update.$set || update); await p.validate(); return p; };
  return rows;
}
const members = memory(Family), assessments = memory(Assessment), purchases = memory(Purchase), appointments = memory(Appointment);
const users = [{ _id: 'alice', name: 'Account Owner', age: 42, gender: 'Male' }, { _id: 'bob', name: 'Other Owner' }, { _id: 'real-test-doctor', name: 'Test Doctor', role: 'doctor', isActive: true, defaultWorkingDays: [] }];
User.findById = async id => users.find(u => u._id === id) || null;
User.findOne = q => new Query(() => users.filter(u => matches(u, q)), true);
User.find = q => new Query(() => users.filter(u => matches(u, q)));
Availability.find = async () => [];
const providerPayments = [];
provider.createOrder = async p => ({ id: `order_${p._id}`, amount: p.amountMinor, currency: p.currency });
provider.fetchPayment = async id => providerPayments.find(p => p.id === id);
provider.orderPayments = async id => ({ items: providerPayments.filter(p => p.order_id === id) });
const app = express(); app.use(express.json());
app.use('/api/family-members', require('../routes/familyMemberRoutes'));
app.use('/api/prakriti', require('../routes/prakritiRoutes'));
app.use('/api/wellness', require('../routes/wellnessRoutes'));
app.use('/api/appointments', require('../routes/appointmentRoutes'));
const server = app.listen(0, '127.0.0.1');
after(() => server.close());
async function request(path, { method = 'GET', body, user = 'alice' } = {}) {
  if (!server.listening) await new Promise(resolve => server.once('listening', resolve));
  const res = await fetch(`http://127.0.0.1:${server.address().port}/api${path}`, { method, headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${jwt.sign({ phone: user }, process.env.JWT_SECRET)}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, data: await res.json() };
}
const memberBody = (fullName, relationship, dateOfBirth, gender) => ({ fullName, relationship, dateOfBirth, gender, accountUserId: 'bob' });
let samarth, taapsee;
test('validation rejects invalid dates, future dates and fabricated Self profiles', () => {
  for (const value of [memberBody('X', 'Son', '2024-02-30', 'Male'), memberBody('X', 'Self', '2000-01-01', 'Male'), memberBody('X', 'Son', '2999-01-01', 'Male'), memberBody('', 'Son', '2000-01-01', 'Male')]) assert.throws(() => service.validate(value), { status: 400 });
});
test('one real Self, add/edit dependents, ownership, and no self deletion', async () => {
  assert.equal((await request('/family-members', { user: null })).status, 401);
  const initial = await request('/family-members');
  assert.equal(initial.data.members.length, 1); assert.equal(initial.data.members[0].id, 'self'); assert.equal(members.length, 0);
  for (const details of [memberBody('Gurpreet Kaur', 'Spouse', '1990-01-01', 'Female'), memberBody('Samarth', 'Son', '2014-01-01', 'Male'), memberBody('Taapsee', 'Daughter', '2020-01-01', 'Female')]) {
    const created = await request('/family-members', { method: 'POST', body: details });
    assert.equal(created.status, 201); assert.equal(created.data.member.accountUserId, 'alice');
    if (details.fullName === 'Samarth') samarth = created.data.member;
    if (details.fullName === 'Taapsee') taapsee = created.data.member;
  }
  assert.equal((await request('/family-members')).data.members.length, 4);
  assert.equal((await request('/family-members', { user: 'bob' })).data.members.length, 1);
  assert.equal((await request(`/family-members/${samarth.id}`, { user: 'bob' })).status, 404);
  assert.equal((await request(`/family-members/${samarth.id}`, { method: 'PATCH', user: 'bob', body: { fullName: 'Stolen' } })).status, 404);
  assert.equal((await request(`/family-members/${samarth.id}`, { method: 'DELETE', user: 'bob' })).status, 404);
  assert.equal((await request('/family-members/self', { method: 'DELETE' })).status, 403);
  assert.equal((await request(`/family-members/${samarth.id}`, { method: 'PATCH', body: { fullName: 'Samarth', gender: 'Male' } })).status, 200);
});
test('assessments and latest/history remain separated by account and member', async () => {
  const answers = dosha => questionIds.map(questionId => ({ questionId, selectedDosha: dosha }));
  const first = await request('/prakriti/assessments', { method: 'POST', body: { familyMemberId: samarth.id, answers: answers('vata') } });
  assert.equal(first.status, 201); assert.equal(first.data.assessment.familyMemberId, samarth.id);
  assert.equal((await request(`/prakriti/assessments/latest?familyMemberId=${taapsee.id}`)).status, 404);
  assert.equal((await request('/prakriti/assessments/latest')).status, 404);
  const second = await request('/prakriti/assessments', { method: 'POST', body: { familyMemberId: taapsee.id, answers: answers('pitta') } });
  assert.equal(second.status, 201);
  assert.equal((await request(`/prakriti/assessments/latest?familyMemberId=${samarth.id}`)).data.assessment.prakritiType, 'vata');
  assert.equal((await request(`/prakriti/assessments?familyMemberId=${taapsee.id}`)).data.assessments.length, 1);
  assert.equal((await request(`/prakriti/assessments/${first.data.assessment.id}?familyMemberId=${taapsee.id}`)).status, 404);
  assert.equal((await request(`/prakriti/assessments/latest?familyMemberId=${samarth.id}`, { user: 'bob' })).status, 404);
  assert.equal((await request('/prakriti/assessments', { method: 'POST', user: 'bob', body: { familyMemberId: samarth.id, answers: answers('kapha') } })).status, 404);
});
let purchase;
test('paid plan belongs to beneficiary, not another member or account', async () => {
  const created = await request('/wellness/purchases', { method: 'POST', body: { programId: 'weight', months: 3, currency: 'INR', familyMemberId: samarth.id, requestId: crypto.randomUUID(), amount: 1 } });
  assert.equal(created.status, 201); purchase = created.data.purchase;
  assert.equal(purchase.familyMemberId, samarth.id); assert.equal(purchase.amountMinor, 800000);
  assert.equal((await request(`/wellness/purchases?familyMemberId=${taapsee.id}`)).data.purchases.length, 0);
  assert.equal((await request(`/wellness/purchases/${purchase.id}?familyMemberId=${taapsee.id}`)).status, 404);
  assert.equal((await request(`/wellness/purchases?familyMemberId=${samarth.id}`, { user: 'bob' })).status, 404);
  const payment = { id: 'pay_family', order_id: purchase.orderId, amount: 800000, currency: 'INR', status: 'captured', captured: true };
  providerPayments.push(payment);
  const signature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${purchase.orderId}|${payment.id}`).digest('hex');
  const verified = await request(`/wellness/purchases/${purchase.id}/verify`, { method: 'POST', body: { familyMemberId: samarth.id, orderId: purchase.orderId, paymentId: payment.id, signature } });
  assert.equal(verified.status, 200); assert.equal(verified.data.purchase.status, 'active');
});
test('booking verifies member/plan ownership and uses existing unassigned capacity', async () => {
  const body = { date: '2026-12-01', timeSlot: '10:00 AM - 10:30 AM', reason: 'Prakriti Guidance', purchaseId: purchase.id, familyMemberId: taapsee.id };
  assert.equal((await request('/appointments/book', { method: 'POST', body })).status, 403);
  assert.equal((await request('/appointments/book', { method: 'POST', user: 'bob', body: { ...body, familyMemberId: samarth.id } })).status, 404);
  const booked = await request('/appointments/book', { method: 'POST', body: { ...body, familyMemberId: samarth.id } });
  assert.equal(booked.status, 201); assert.equal(booked.data.appointment.familyMemberId, samarth.id); assert.equal(booked.data.appointment.doctorId, ''); assert.equal(booked.data.appointment.patientName, 'Samarth');
  assert.equal((await request(`/appointments?familyMemberId=${samarth.id}`)).data.appointments.length, 1);
  assert.equal((await request(`/appointments?familyMemberId=${taapsee.id}`)).data.appointments.length, 0);
  assert.equal((await request(`/appointments?familyMemberId=${samarth.id}`, { user: 'bob' })).status, 404);
  assert.equal((await request('/appointments/cancel', { method: 'POST', body })).status, 404);
});
test('archive preserves linked records and disallows new activity; restore works', async () => {
  const counts = [assessments.length, purchases.length, appointments.length];
  assert.equal((await request(`/family-members/${samarth.id}`, { method: 'DELETE' })).status, 200);
  assert.equal((await request('/family-members')).data.members.some(m => m.id === samarth.id), false);
  assert.equal((await request('/family-members?includeArchived=true')).data.members.some(m => m.id === samarth.id), true);
  assert.deepEqual([assessments.length, purchases.length, appointments.length], counts);
  assert.equal((await request(`/prakriti/assessments?familyMemberId=${samarth.id}`)).data.assessments.length, 1);
  assert.equal((await request('/prakriti/assessments', { method: 'POST', body: { familyMemberId: samarth.id, answers: [] } })).status, 404);
  assert.equal((await request(`/family-members/${samarth.id}`, { method: 'PATCH', body: { isActive: true } })).data.member.isActive, true);
});

test('legacy records without a member field belong only to Self', async () => {
  assessments.push({ _id: '000000000000000000000099', userId: 'alice', resultType: 'kapha', completedAt: new Date(), questionnaireVersion: '1', reportVersion: '1' });
  appointments.push({ _id: 'legacy-appointment', userId: 'alice', userName: 'Account Owner', date: '2026-10-01', timeSlot: 'legacy', status: 'pending' });
  assert.equal((await request('/prakriti/assessments/latest?familyMemberId=self')).data.assessment.prakritiType, 'kapha');
  assert.equal((await request(`/prakriti/assessments/latest?familyMemberId=${samarth.id}`)).data.assessment.prakritiType, 'vata');
  assert.equal((await request('/appointments?familyMemberId=self')).data.appointments.length, 1);
  assert.equal((await request(`/appointments?familyMemberId=${taapsee.id}`)).data.appointments.length, 0);
});
