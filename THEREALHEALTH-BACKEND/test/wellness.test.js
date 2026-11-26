const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
process.env.JWT_SECRET = 'wellness-test-jwt';
process.env.RAZORPAY_KEY_ID = 'wellness-test-public';
process.env.RAZORPAY_KEY_SECRET = 'wellness-test-secret';
const jwt = require('jsonwebtoken');
const express = require('express');
const { catalog, selection } = require('../services/wellnessCatalogService');
const provider = require('../services/wellnessPaymentService');
const Purchase = require('../models/WellnessPurchase');
const User = require('../models/User');
const sign = (orderId, paymentId) => crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
const body = (override = {}) => ({ programId: 'weight', months: 3, currency: 'INR', requestId: crypto.randomUUID(), ...override });

test('all six programs use the exact five prices for both currencies', () => {
  assert.equal(catalog.programs.length, 6);
  const prices = [[1, 3000, 45], [3, 8000, 100], [6, 14000, 180], [9, 20000, 250], [12, 26000, 320]];
  for (const program of catalog.programs) for (const [months, inr, usd] of prices) for (const currency of ['INR', 'USD']) {
    const result = selection({ programId: program.id, months, currency, amountMinor: 1 });
    assert.equal(result.inrAmount, inr); assert.equal(result.usdAmount, usd);
    assert.equal(result.amountMinor, (currency === 'INR' ? inr : usd) * 100);
  }
  for (const bad of [{}, { programId: 'fake', months: 3, currency: 'INR' }, body({ months: 2 }), body({ months: '3' }), body({ currency: 'EUR' })]) assert.throws(() => selection(bad), { status: 400 });
});
test('signature checks stored order and uses constant-time HMAC comparison', () => {
  assert.equal(provider.signatureValid('order_one', 'pay_one', sign('order_one', 'pay_one')), true);
  assert.equal(provider.signatureValid('order_two', 'pay_one', sign('order_one', 'pay_one')), false);
  for (const signature of [null, '', 'xyz', 'a'.repeat(64)]) assert.equal(provider.signatureValid('order_one', 'pay_one', signature), false);
});

const records = [];
const payments = new Map();
let ordersCreated = 0;
let failProvider = false;
const match = (p, q) => Object.entries(q).every(([k, v]) => v && typeof v === 'object' && v.$in ? v.$in.includes(p[k] ?? null) : String(p[k]) === String(v));
User.findById = async id => id === 'missing' ? null : { _id: id };
User.findOne = async q => ({ _id: q.googleId });
Purchase.create = async data => {
  const p = new Purchase(data);
  await p.validate();
  p.save = async () => { await p.validate(); return p; };
  records.push(p); return p;
};
Purchase.findOne = async q => records.find(p => match(p, q)) || null;
Purchase.findById = async id => records.find(p => String(p._id) === String(id)) || null;
Purchase.find = q => ({ sort: () => ({ limit: async limit => records.filter(p => match(p, q)).slice(-limit).reverse() }) });
Purchase.findOneAndUpdate = async (q, update) => { const p = records.find(p => match(p, q)); if (!p) return null; Object.assign(p, update.$set); await p.validate(); return p; };
provider.createOrder = async p => { ordersCreated++; if (failProvider) throw Object.assign(new Error('Provider unavailable'), { status: 502 }); return { id: `order_${ordersCreated}`, amount: p.amountMinor, currency: p.currency }; };
provider.fetchPayment = async id => payments.get(id) || {};
provider.orderPayments = async orderId => ({ items: [...payments.values()].filter(p => p.order_id === orderId) });
const app = express(); app.use(express.json()); app.use('/api/wellness', require('../routes/wellnessRoutes'));
const server = app.listen(0, '127.0.0.1');
after(() => server.close());
async function request(path, { data, user = 'alice', claims } = {}) {
  if (!server.listening) await new Promise(resolve => server.once('listening', resolve));
  const res = await fetch(`http://127.0.0.1:${server.address().port}/api/wellness${path}`, { method: data ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${jwt.sign(claims || { phone: user }, process.env.JWT_SECRET)}` } : {}) }, body: data ? JSON.stringify(data) : undefined });
  return { status: res.status, json: await res.json() };
}
function paymentFor(p, overrides = {}) { return { id: `pay_${ordersCreated}`, order_id: p.orderId, amount: p.amountMinor, currency: p.currency, status: 'captured', captured: true, ...overrides }; }
function callback(p, pay) { return { orderId: p.orderId, paymentId: pay.id, signature: sign(p.orderId, pay.id) }; }

test('auth, catalog, validation, trusted price, idempotency and owned records', async () => {
  assert.equal((await request('/catalog', { user: null })).status, 401);
  assert.equal((await request('/catalog', { claims: { registrationOnly: true, googleId: 'pending' } })).status, 401);
  assert.equal((await request('/catalog', { user: 'missing' })).status, 401);
  assert.equal((await request('/catalog')).json.catalog.programs.length, 6);
  assert.equal((await request('/purchases', { data: body({ months: 8 }) })).status, 400);
  assert.equal((await request('/purchases', { data: body({ requestId: 'x' }) })).status, 400);
  const data = body({ amountMinor: 1, userId: 'mallory', doctorId: 'fake' });
  const response = await request('/purchases', { data });
  assert.equal(response.status, 201);
  const p = response.json.purchase;
  assert.equal(p.amountMinor, 800000); assert.equal(p.usdAmount, 100); assert.equal(p.status, 'pending');
  assert.equal(records.at(-1).userId, 'alice'); assert.equal(records.at(-1).doctorId, undefined);
  assert.equal(response.json.checkout.keyId, process.env.RAZORPAY_KEY_ID);
  assert.equal(JSON.stringify(response.json).includes(process.env.RAZORPAY_KEY_SECRET), false);
  const before = ordersCreated;
  assert.equal((await request('/purchases', { data })).json.purchase.id, p.id);
  assert.equal(ordersCreated, before);
  assert.equal((await request('/purchases', { data: { ...data, months: 6 } })).status, 409);
  assert.equal((await request(`/purchases/${p.id}`, { user: 'bob' })).status, 404);
  assert.equal((await request('/purchases/invalid')).status, 400);
  assert.equal((await request('/purchases', { user: 'bob' })).json.purchases.length, 0);
});
test('only a matching captured payment activates; retries preserve activation date', async () => {
  const p = (await request('/purchases', { data: body() })).json.purchase;
  const pay = paymentFor(p);
  payments.set(pay.id, pay);
  assert.equal((await request(`/purchases/${p.id}/verify`, { data: { ...callback(p, pay), signature: '0'.repeat(64) } })).status, 400);
  assert.equal((await request(`/purchases/${p.id}/verify`, { user: 'bob', data: callback(p, pay) })).status, 404);
  for (const mismatch of [{ amount: 1 }, { currency: 'USD' }, { order_id: 'order_wrong' }]) {
    payments.set(pay.id, { ...pay, ...mismatch });
    assert.equal((await request(`/purchases/${p.id}/verify`, { data: callback(p, pay) })).status, 400);
    assert.equal(records.at(-1).status, 'pending');
  }
  payments.set(pay.id, { ...pay, status: 'authorized', captured: false });
  assert.equal((await request(`/purchases/${p.id}/verify`, { data: callback(p, pay) })).status, 202);
  assert.equal((await request(`/purchases/${p.id}`)).json.checkout, null);
  assert.equal(records.at(-1).status, 'pending');
  payments.set(pay.id, pay);
  const verified = await request(`/purchases/${p.id}/verify`, { data: callback(p, pay) });
  assert.equal(verified.status, 200); assert.equal(verified.json.purchase.status, 'active');
  const repeated = await request(`/purchases/${p.id}/verify`, { data: callback(p, pay) });
  assert.equal(repeated.json.purchase.activatedAt, verified.json.purchase.activatedAt);
});
test('server recovery after a lost callback verifies captured order payment', async () => {
  const p = (await request('/purchases', { data: body({ programId: 'stress', months: 12, currency: 'USD' }), claims: { googleId: 'google-user' } })).json.purchase;
  assert.equal(p.amountMinor, 32000); assert.equal(p.inrAmount, 26000);
  const pay = paymentFor(p); payments.set(pay.id, pay);
  const recovered = await request(`/purchases/${p.id}`, { claims: { googleId: 'google-user' } });
  assert.equal(recovered.json.purchase.status, 'active'); assert.equal(recovered.json.checkout, null);
});
test('unconfigured or failed provider never creates an active plan', async () => {
  const secret = process.env.RAZORPAY_KEY_SECRET; delete process.env.RAZORPAY_KEY_SECRET;
  const count = records.length;
  assert.equal((await request('/purchases', { data: body() })).status, 503);
  assert.equal(records.length, count); process.env.RAZORPAY_KEY_SECRET = secret;
  failProvider = true;
  const data = body();
  assert.equal((await request('/purchases', { data })).status, 502);
  assert.equal(records.at(-1).status, 'setup_failed');
  failProvider = false;
  const before = ordersCreated;
  assert.equal((await request('/purchases', { data })).status, 409);
  assert.equal(ordersCreated, before);
});
