const crypto = require('node:crypto');
function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !secret) throw Object.assign(new Error('Payments are not configured yet. Please try again later.'), { status: 503 });
  return { keyId, secret };
}
async function request(path, body) {
  const { keyId, secret } = credentials();
  try {
    const response = await fetch(`https://api.razorpay.com/v1${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString('base64')}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error('Provider rejected request');
    return await response.json();
  } catch (_) { throw Object.assign(new Error('Unable to confirm payment with Razorpay. Please check payment status before trying again.'), { status: 502 }); }
}
function signatureValid(orderId, paymentId, signature) {
  if (typeof signature !== 'string' || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = crypto.createHmac('sha256', credentials().secret).update(`${orderId}|${paymentId}`).digest();
  return crypto.timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}
function matches(purchase, payment) {
  return payment && payment.order_id === purchase.orderId && payment.amount === purchase.amountMinor && payment.currency === purchase.currency && typeof payment.id === 'string' && /^pay_[a-zA-Z0-9]+$/.test(payment.id);
}
module.exports = { credentials, signatureValid, matches,
  createOrder: purchase => request('/orders', { amount: purchase.amountMinor, currency: purchase.currency, receipt: String(purchase._id), partial_payment: false }),
  fetchPayment: id => request(`/payments/${encodeURIComponent(id)}`),
  orderPayments: id => request(`/orders/${encodeURIComponent(id)}/payments`),
};
