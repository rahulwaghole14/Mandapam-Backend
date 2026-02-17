// Quick test to verify Razorpay configuration
require('dotenv').config();
const paymentService = require('./services/paymentService');

async function testRazorpay() {
  try {
    console.log('🧪 Testing Razorpay Configuration...\n');
    
    console.log('Environment Check:');
    const keyId = process.env.RAZORPAY_KEY_ID ? process.env.RAZORPAY_KEY_ID.trim() : '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET ? process.env.RAZORPAY_KEY_SECRET.trim() : '';
    console.log('RAZORPAY_KEY_ID:', keyId ? `✅ Set (${keyId.substring(0, 15)}...)` : '❌ Not set');
    console.log('RAZORPAY_KEY_SECRET:', keySecret ? `✅ Set (${keySecret.substring(0, 10)}...)` : '❌ Not set');
    console.log('Key ID length:', keyId.length);
    console.log('Key Secret length:', keySecret.length);
    console.log('');

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.log('⚠️  Razorpay keys not found in environment.');
      console.log('📝 To test locally, set these in your .env file:');
      console.log('   RAZORPAY_KEY_ID=rzp_test_RQ5ITAzm7AyNN9');
      console.log('   RAZORPAY_KEY_SECRET=USvxQvbw66SkkyFLVuUq0JLw');
      console.log('');
      console.log('⚠️  NOTE: These are TEST keys. Never commit them to git!');
      process.exit(1);
    }

    // Test creating a small order (1 rupee)
    console.log('💰 Creating test order (₹1.00)...');
    const order = await paymentService.createOrder(1.00, `test_${Date.now()}`);
    console.log('✅ Order created successfully!');
    console.log('Order ID:', order.id);
    console.log('Amount:', order.amount / 100, 'INR');
    console.log('Status:', order.status);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.error) {
      console.error('Razorpay API Error:', error.error);
    }
    process.exit(1);
  }
}

testRazorpay();

