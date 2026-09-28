const Purchase = require('../models/WellnessPurchase');
const User = require('../models/User');
const family = require('../services/familyMemberService');
const { catalog, selection } = require('../services/wellnessCatalogService');
const payment = require('../services/wellnessPaymentService');
const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
const handle = fn => async (req, res) => {
  try { await fn(req, res); }
  catch (error) {
    const status = [400, 401, 403, 404, 409, 502, 503].includes(error.status) ? error.status : 500;
    res.status(status).json({ success: false, message: status === 500 ? 'Unable to process your plan. Please try again.' : error.message });
  }
};
const owner = async (req, res, next) => {
  try {
    const token = req.user;
    if (token.registrationOnly) return res.status(401).json({ success: false, message: 'Complete registration first.' });
    const id = token.phone || token._id || token.id;
    const user = id ? await User.findById(id) : token.googleId ? await User.findOne({ googleId: token.googleId }) : null;
    if (!user) return res.status(401).json({ success: false, message: 'Please sign in again.' });
    req.wellnessUserId = user._id;
    req.accountUser = user;
    next();
  } catch (_) { res.status(500).json({ success: false, message: 'Unable to load account.' }); }
};
function publicPurchase(p) {
  return { id: String(p._id), familyMemberId: p.familyMemberId || 'self', beneficiaryName: p.beneficiaryName || '', programId: p.programId, programName: p.programName, months: p.months, durationLabel: p.durationLabel, inrAmount: p.inrAmount, usdAmount: p.usdAmount, currency: p.currency, amountMinor: p.amountMinor, status: p.status, orderId: p.orderId, activatedAt: p.activatedAt, createdAt: p.createdAt };
}
async function owned(req) {
  if (!/^[a-f0-9]{24}$/i.test(req.params.id)) fail(400, 'Invalid purchase ID.');
  const member = await family.resolve(req.accountUser, req.body?.familyMemberId ?? req.query.familyMemberId, { allowArchived: true });
  const p = await Purchase.findOne({ _id: req.params.id, userId: req.wellnessUserId, ...family.scope(member.id) });
  if (!p) fail(404, 'Plan purchase not found.');
  return p;
}
async function activate(p, providerPayment) {
  if (!payment.matches(p, providerPayment)) fail(400, 'Payment does not match this plan.');
  if (providerPayment.status !== 'captured' || providerPayment.captured !== true) return p;
  // Compare-and-set makes callback retries and concurrent recovery idempotent.
  return await Purchase.findOneAndUpdate({ _id: p._id, userId: p.userId, status: 'pending' }, { $set: { status: 'active', paymentId: providerPayment.id, activatedAt: new Date() } }, { new: true, runValidators: true }) || await Purchase.findById(p._id);
}
async function refresh(p) {
  if (p.status !== 'pending' || !p.orderId) return p;
  const result = await payment.orderPayments(p.orderId);
  const captured = (result.items || []).find(item => payment.matches(p, item) && item.status === 'captured' && item.captured === true);
  if (captured) return activate(p, captured);
  p.awaitingCapture = (result.items || []).some(item => payment.matches(p, item) && item.status === 'authorized');
  return p;
}
function checkout(p) {
  return p.status === 'pending' && !p.awaitingCapture ? { keyId: payment.credentials().keyId, orderId: p.orderId, amount: p.amountMinor, currency: p.currency } : null;
}
const getCatalog = handle(async (_req, res) => res.json({ success: true, catalog }));
const create = handle(async (req, res) => {
  const member = await family.resolve(req.accountUser, req.body?.familyMemberId);
  const selected = selection(req.body);
  const requestId = req.body?.requestId;
  if (typeof requestId !== 'string' || !/^[a-f0-9-]{32,64}$/i.test(requestId)) fail(400, 'A valid request identifier is required.');
  payment.credentials();
  let p = await Purchase.findOne({ userId: req.wellnessUserId, requestId });
  if (!p) {
    try { p = await Purchase.create({ ...selected, userId: req.wellnessUserId, familyMemberId: member.id, beneficiaryName: member.fullName, requestId }); }
    catch (error) {
      if (error.code !== 11000) throw error;
      p = await Purchase.findOne({ userId: req.wellnessUserId, requestId });
      if (!p) throw error;
      fail(409, 'Payment setup is in progress. Check recent plans before trying again.');
    }
    try {
      const order = await payment.createOrder(p);
      if (!order || !/^order_[a-zA-Z0-9]+$/.test(order.id) || order.amount !== p.amountMinor || order.currency !== p.currency) fail(502, 'Payment order could not be validated.');
      p.orderId = order.id;
      p.status = 'pending';
      await p.save();
    } catch (error) {
      // Do not create another provider order on an ambiguous retry.
      p.status = 'setup_failed';
      await p.save();
      throw error;
    }
  } else if ((p.familyMemberId || 'self') !== member.id || p.programId !== selected.programId || p.months !== selected.months || p.currency !== selected.currency) {
    fail(409, 'This payment request belongs to a different selection.');
  }
  if (p.status === 'creating' || p.status === 'setup_failed') fail(409, 'Payment setup could not be completed. No plan is activated. Please contact support before retrying this purchase.');
  // Existing orders are rechecked before checkout can be offered again.
  p = await refresh(p);
  res.status(201).json({ success: true, purchase: publicPurchase(p), checkout: checkout(p) });
});
const verify = handle(async (req, res) => {
  const p = await owned(req);
  const { paymentId, orderId, signature } = req.body || {};
  if (typeof paymentId !== 'string' || !/^pay_[a-zA-Z0-9]+$/.test(paymentId) || orderId !== p.orderId || !payment.signatureValid(p.orderId, paymentId, signature)) fail(400, 'Payment verification failed.');
  if (p.status === 'active') {
    if (p.paymentId !== paymentId) fail(409, 'This purchase already has a verified payment.');
    return res.json({ success: true, purchase: publicPurchase(p) });
  }
  if (p.status !== 'pending') fail(409, 'This purchase is not ready for verification.');
  const providerPayment = await payment.fetchPayment(paymentId);
  if (providerPayment.id !== paymentId) fail(400, 'Payment verification failed.');
  const updated = await activate(p, providerPayment);
  res.status(updated.status === 'active' ? 200 : 202).json({ success: true, purchase: publicPurchase(updated) });
});
const get = handle(async (req, res) => {
  const p = await refresh(await owned(req));
  res.json({ success: true, purchase: publicPurchase(p), checkout: checkout(p) });
});
const list = handle(async (req, res) => {
  const member = await family.resolve(req.accountUser, req.query.familyMemberId, { allowArchived: true });
  const records = await Purchase.find({ userId: req.wellnessUserId, ...family.scope(member.id) }).sort({ createdAt: -1 }).limit(10);
  res.json({ success: true, purchases: records.map(publicPurchase) });
});
module.exports = { owner, getCatalog, create, verify, get, list };
