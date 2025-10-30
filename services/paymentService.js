const Razorpay = require('razorpay');
const crypto = require('crypto');

const key_id = process.env.RAZORPAY_KEY_ID || '';
const key_secret = process.env.RAZORPAY_KEY_SECRET || '';

const razorpay = (key_id && key_secret)
  ? new Razorpay({ key_id, key_secret })
  : null;

async function createOrder(amountInRupees, receipt) {
  if (!razorpay) throw new Error('Razorpay is not configured');
  const amount = Math.round(Number(amountInRupees) * 100);
  return await razorpay.orders.create({ amount, currency: 'INR', receipt });
}

function verifySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected = crypto
    .createHmac('sha256', key_secret)
    .update(payload)
    .digest('hex');
  return expected === razorpay_signature;
}

module.exports = {
  createOrder,
  verifySignature
};


