require('dotenv').config();
const axios = require('axios');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000/api';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN; // Web admin token
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@mandap.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Test configuration
const TEST_EVENT_ID = process.env.TEST_EVENT_ID || 32; // Event ID to test with
const TEST_MEMBER_ID = process.env.TEST_MEMBER_ID || 668; // Member ID for admin registration test

let authToken = ADMIN_TOKEN;

// Login function
async function login() {
  try {
    console.log('🔐 Attempting to login...');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (response.data.success && response.data.token) {
      authToken = response.data.token;
      console.log('✅ Login successful');
      return true;
    }
    return false;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data?.message || error.message);
    return false;
  }
}

if (!authToken) {
  console.log('⚠️  ADMIN_TOKEN not provided, attempting to login...');
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Set auth token dynamically
function setAuthToken(token) {
  api.defaults.headers['Authorization'] = `Bearer ${token}`;
}

let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

function logTest(name, passed, message = '') {
  if (passed) {
    console.log(`✅ ${name}`);
    testResults.passed++;
  } else {
    console.log(`❌ ${name}`);
    console.log(`   ${message}`);
    testResults.failed++;
    testResults.errors.push({ test: name, error: message });
  }
}

async function testCheckRegistrationStatus() {
  console.log('\n📋 Test 1: Check Registration Status');
  console.log('-'.repeat(60));
  
  try {
    const response = await api.get(`/events/${TEST_EVENT_ID}/my-registration`);
    logTest('Check registration status endpoint', response.status === 200);
    
    if (response.data.success) {
      console.log(`   Is Registered: ${response.data.isRegistered}`);
      if (response.data.isRegistered) {
        console.log(`   Registration ID: ${response.data.registration.id}`);
        console.log(`   Payment Status: ${response.data.registration.paymentStatus}`);
        console.log(`   QR Code: ${response.data.registration.qrDataURL ? 'Generated' : 'Not available'}`);
      }
    }
    return response.data;
  } catch (error) {
    logTest('Check registration status endpoint', false, error.response?.data?.message || error.message);
    return null;
  }
}

async function testInitiatePayment() {
  console.log('\n💳 Test 2: Initiate Payment Registration');
  console.log('-'.repeat(60));
  
  try {
    const response = await api.post(`/events/${TEST_EVENT_ID}/register-payment`);
    
    if (response.data.success && response.data.isFree) {
      console.log('   ⚠️  Event is free - skipping payment flow');
      logTest('Free event handling', true);
      return { isFree: true };
    }
    
    logTest('Initiate payment endpoint', response.status === 201 || response.status === 200);
    
    if (response.data.success && !response.data.isFree) {
      console.log(`   Order ID: ${response.data.order?.id}`);
      console.log(`   Amount: ₹${response.data.order?.amount / 100}`);
      console.log(`   Razorpay Key: ${response.data.keyId}`);
      console.log(`   Payment Options: ${response.data.paymentOptions ? 'Available' : 'Missing'}`);
      
      // Verify payment options structure
      const hasRequiredFields = response.data.paymentOptions && 
        response.data.paymentOptions.key &&
        response.data.paymentOptions.amount &&
        response.data.paymentOptions.order_id;
      logTest('Payment options structure', hasRequiredFields);
      
      return response.data;
    }
    
    return null;
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message;
    logTest('Initiate payment endpoint', false, errorMsg);
    
    // Check if already registered
    if (error.response?.status === 400 && errorMsg.includes('already registered')) {
      console.log('   ℹ️  Already registered - this is expected if testing multiple times');
    }
    
    return null;
  }
}

async function testInitiatePaymentWithMemberId() {
  console.log('\n👤 Test 3: Admin Registration for Member');
  console.log('-'.repeat(60));
  
  try {
    const response = await api.post(`/events/${TEST_EVENT_ID}/register-payment`, {
      memberId: TEST_MEMBER_ID
    });
    
    if (response.data.success && response.data.isFree) {
      console.log('   ⚠️  Event is free - skipping payment flow');
      logTest('Admin free event handling', true);
      return { isFree: true };
    }
    
    logTest('Admin initiate payment with memberId', response.status === 201 || response.status === 200);
    
    if (response.data.success && !response.data.isFree) {
      console.log(`   Member ID: ${TEST_MEMBER_ID}`);
      console.log(`   Order ID: ${response.data.order?.id}`);
      console.log(`   Amount: ₹${response.data.order?.amount / 100}`);
      return response.data;
    }
    
    return null;
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message;
    logTest('Admin initiate payment with memberId', false, errorMsg);
    return null;
  }
}

async function testGetMyRegistrations() {
  console.log('\n📝 Test 4: Get My Registrations');
  console.log('-'.repeat(60));
  
  try {
    const response = await api.get('/events/my/registrations');
    logTest('Get my registrations endpoint', response.status === 200);
    
    if (response.data.success) {
      console.log(`   Total Registrations: ${response.data.registrations?.length || 0}`);
      
      if (response.data.registrations && response.data.registrations.length > 0) {
        const firstReg = response.data.registrations[0];
        console.log(`   First Event: ${firstReg.event?.title}`);
        console.log(`   Status: ${firstReg.status}`);
        console.log(`   Payment Status: ${firstReg.paymentStatus}`);
        console.log(`   QR Code: ${firstReg.qrDataURL ? 'Available' : 'Missing'}`);
        
        // Verify structure
        const hasRequiredFields = firstReg.event &&
          firstReg.status &&
          firstReg.paymentStatus !== undefined;
        logTest('Registration structure', hasRequiredFields);
      }
    }
    
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message;
    logTest('Get my registrations endpoint', false, errorMsg);
    return null;
  }
}

async function testEventDetails() {
  console.log('\n📅 Test 5: Event Details');
  console.log('-'.repeat(60));
  
  try {
    const response = await api.get(`/events/${TEST_EVENT_ID}`);
    logTest('Get event details', response.status === 200);
    
    if (response.data.success) {
      const event = response.data.event;
      console.log(`   Event: ${event.title}`);
      console.log(`   Fee: ₹${event.registrationFee || 0}`);
      console.log(`   Status: ${event.status}`);
      console.log(`   Current Attendees: ${event.currentAttendees || 0}`);
      console.log(`   Max Attendees: ${event.maxAttendees || 'Unlimited'}`);
    }
    
    return response.data;
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message;
    logTest('Get event details', false, errorMsg);
    return null;
  }
}

async function testInvalidEventId() {
  console.log('\n🚫 Test 6: Error Handling - Invalid Event ID');
  console.log('-'.repeat(60));
  
  try {
    await api.get('/events/999999/my-registration');
    logTest('Invalid event ID handling', false, 'Should return 404');
  } catch (error) {
    const is404 = error.response?.status === 404 || error.response?.status === 400;
    logTest('Invalid event ID handling', is404, error.response?.data?.message || '');
  }
}

async function testInvalidMemberId() {
  console.log('\n🚫 Test 7: Error Handling - Invalid Member ID');
  console.log('-'.repeat(60));
  
  try {
    await api.post(`/events/${TEST_EVENT_ID}/register-payment`, {
      memberId: 999999
    });
    logTest('Invalid member ID handling', false, 'Should return 404');
  } catch (error) {
    const is404 = error.response?.status === 404;
    logTest('Invalid member ID handling', is404, error.response?.data?.message || '');
  }
}

async function runAllTests() {
  console.log('🧪 Web Event Registration API Tests');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Event ID: ${TEST_EVENT_ID}`);
  console.log(`Member ID: ${TEST_MEMBER_ID}`);
  console.log('='.repeat(60));
  
  // Try to login if no token provided
  if (!authToken) {
    const loggedIn = await login();
    if (!loggedIn) {
      console.error('\n❌ Cannot proceed without authentication token');
      console.log('Please provide ADMIN_TOKEN or set ADMIN_EMAIL and ADMIN_PASSWORD');
      process.exit(1);
    }
  }
  
  // Set auth token
  setAuthToken(authToken);
  
  // Test 1: Get event details first
  await testEventDetails();
  
  // Test 2: Check registration status
  await testCheckRegistrationStatus();
  
  // Test 3: Initiate payment (self registration)
  const paymentData = await testInitiatePayment();
  
  // Test 4: Admin registration for member
  await testInitiatePaymentWithMemberId();
  
  // Test 5: Get my registrations
  await testGetMyRegistrations();
  
  // Test 6: Error handling
  await testInvalidEventId();
  await testInvalidMemberId();
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
  
  if (testResults.errors.length > 0) {
    console.log('\n❌ Errors:');
    testResults.errors.forEach((err, idx) => {
      console.log(`   ${idx + 1}. ${err.test}: ${err.error}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  // Note about payment confirmation
  if (paymentData && !paymentData.isFree && paymentData.order) {
    console.log('\n📝 Note: Payment confirmation test skipped');
    console.log('   To test payment confirmation, you need to:');
    console.log('   1. Complete Razorpay payment manually');
    console.log('   2. Use the payment response to call confirm-payment endpoint');
    console.log('   3. Or use Razorpay test keys in test mode');
  }
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('\n❌ Test execution failed:', error.message);
  process.exit(1);
});

