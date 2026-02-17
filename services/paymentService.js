const Razorpay = require('razorpay');
const crypto = require('crypto');
const Logger = require('../utils/logger');

const key_id = (process.env.RAZORPAY_KEY_ID || '').trim();
const key_secret = (process.env.RAZORPAY_KEY_SECRET || '').trim();

const razorpay = (key_id && key_secret)
  ? new Razorpay({ key_id, key_secret })
  : null;

async function createOrder(amountInRupees, receipt) {
  if (!razorpay) {
    throw new Error('Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
  }
  
  // Validate key format
  if (!key_id.startsWith('rzp_test_') && !key_id.startsWith('rzp_live_')) {
    console.error(`Invalid RAZORPAY_KEY_ID format. Key should start with 'rzp_test_' or 'rzp_live_'. Got: ${key_id.substring(0, 15)}...`);
    throw new Error('Invalid Razorpay key format. Key ID must start with rzp_test_ or rzp_live_');
  }
  
  if (key_secret.length < 20) {
    console.error(`Invalid RAZORPAY_KEY_SECRET length. Expected at least 20 characters. Got: ${key_secret.length}`);
    throw new Error('Invalid Razorpay secret format. Secret key appears to be too short.');
  }
  
  const amount = Math.round(Number(amountInRupees) * 100);
  if (isNaN(amount) || amount <= 0) {
    throw new Error(`Invalid amount: ${amountInRupees}. Amount must be a positive number.`);
  }

  try {
    Logger.info('Razorpay: creating order', {
      amountInRupees,
      amountInPaise: amount,
      receipt
    });
    
    return await razorpay.orders.create({ 
      amount, 
      currency: 'INR', 
      receipt: receipt || `receipt_${Date.now()}` 
    });
  } catch (error) {
    console.error('Razorpay order creation failed:', {
      statusCode: error.statusCode,
      error: error.error,
      keyIdPrefix: key_id.substring(0, 15) + '...',
      keySecretLength: key_secret.length
    });
    
    // Log to Logger for Render visibility
    Logger.error('Payment Service: Razorpay order creation failed', error, {
      statusCode: error.statusCode,
      errorCode: error.error?.code,
      errorDescription: error.error?.description,
      receipt: receipt,
      amount: amountInRupees,
      keyIdPrefix: key_id.substring(0, 15) + '...',
      keySecretLength: key_secret.length
    });
    
    if (error.statusCode === 401) {
      throw new Error(`Razorpay authentication failed. Please verify that RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are correct and match each other (both test or both live keys).`);
    }
    
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
  const isValid = expected === razorpay_signature;

  Logger.debug('Razorpay: signature verification result', {
    razorpay_order_id,
    razorpay_payment_id,
    isValid
  });

  return isValid;
}

async function processRefund(paymentId, amountInRupees, notes = {}) {
  if (!razorpay) {
    throw new Error('Razorpay is not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET environment variables.');
  }
  
  if (!paymentId) {
    throw new Error('Payment ID is required for refund.');
  }
  
  const amount = amountInRupees ? Math.round(Number(amountInRupees) * 100) : undefined;
  
  if (amount && (isNaN(amount) || amount <= 0)) {
    throw new Error(`Invalid refund amount: ${amountInRupees}. Amount must be a positive number.`);
  }

  try {
    const refundData = {
      notes: {
        ...notes,
        refund_processed_at: new Date().toISOString(),
        refund_source: 'mandapam_backend'
      }
    };
    
    // Only add amount if specified (for partial refunds)
    if (amount) {
      refundData.amount = amount;
    }
    
    Logger.info('Payment Service: Initiating Razorpay refund', {
      paymentId,
      amountInRupees,
      notes
    });

    const refund = await razorpay.payments.refund(paymentId, refundData);
    
    Logger.debug('Payment Service: Razorpay refund API response', {
      paymentId,
      refundId: refund?.id,
      rawStatus: refund?.status,
      amount: refund?.amount
    });
    
    Logger.info('Refund processed successfully', {
      paymentId,
      refundId: refund.id,
      amount: refund.amount,
      status: refund.status
    });
    
    return refund;
  } catch (error) {
    Logger.error('Payment Service: Razorpay refund failed', error, {
      paymentId,
      amount: amountInRupees,
      statusCode: error.statusCode,
      errorCode: error.error?.code,
      errorDescription: error.error?.description
    });
    
    if (error.statusCode === 400 && error.error?.code === 'BAD_REQUEST_ERROR') {
      throw new Error(`Refund failed: ${error.error.description}`);
    }
    
    if (error.statusCode === 401) {
      throw new Error(`Razorpay authentication failed. Please verify that RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are correct.`);
    }
    
    throw new Error(`Refund failed: ${error.error?.description || error.message}`);
  }
}

module.exports = {
  createOrder,
  verifySignature,
  processRefund
};


