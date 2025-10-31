const Razorpay = require('razorpay');
const crypto = require('crypto');

const key_id = process.env.RAZORPAY_KEY_ID || '';
const key_secret = process.env.RAZORPAY_KEY_SECRET || '';

const razorpay = (key_id && key_secret)
  ? new Razorpay({ key_id, key_secret })
  : null;

async function createOrder(amountInRupees, receipt) {
  if (!razorpay) {
    throw new Error('Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
  }
  
  const amount = Math.round(Number(amountInRupees) * 100);
  if (isNaN(amount) || amount <= 0) {
    throw new Error(`Invalid amount: ${amountInRupees}. Amount must be a positive number.`);
  }

  try {
    return await razorpay.orders.create({ 
      amount, 
      currency: 'INR', 
      receipt: receipt || `receipt_${Date.now()}` 
    });
  } catch (error) {
    console.error('Razorpay order creation failed:', error);
    if (error.error && error.error.description) {
      throw new Error(`Razorpay error: ${error.error.description}`);
    }
    throw error;
  }
}

function verifySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  if (!key_secret) {
    throw new Error('Razorpay is not configured. Cannot verify payment signature.');
  }
  
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return false;
  }
  
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


