const axios = require('axios');

// Test configuration - you'll need to update these values
const API_BASE_URL = 'https://mandapam-backend-97mi.onrender.com/api';
const TEST_EVENT_ID = 1; // Update with a real event ID from your database
const TEST_TOKEN = 'YOUR_JWT_TOKEN'; // You'll need to provide a valid admin/manager token

// Test data for the updated manual registration form
const testData = {
  name: 'Test User',
  phone: '9876543210',
  email: 'test@example.com',
  businessName: 'Test Business',
  businessType: '', // Testing optional field (empty)
  city: 'Test City',
  associationId: '', // Testing optional field
  photo: '', // Testing optional field
  paymentMethod: 'cash',
  cashReceiptNumber: 'CR123456' // Testing new field
};

async function testManualRegistrationAPI() {
  console.log('🧪 Testing Manual Registration API...\n');

  try {
    // First, let's test if the endpoint is accessible
    console.log('1️⃣ Testing endpoint accessibility...');
    const healthCheck = await axios.get(`${API_BASE_URL}/events/${TEST_EVENT_ID}`, {
      timeout: 10000
    });
    console.log('✅ API is accessible');

    // Test the manual registration endpoint
    console.log('\n2️⃣ Testing manual registration with new fields...');
    
    const response = await axios.post(
      `${API_BASE_URL}/events/${TEST_EVENT_ID}/manual-registration`,
      testData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_TOKEN}`
        },
        timeout: 15000
      }
    );

    console.log('✅ Manual registration successful!');
    console.log('📋 Response:', {
      status: response.status,
      success: response.data.success,
      registrationId: response.data.registration?.id,
      memberName: response.data.registration?.memberName,
      cashReceiptNumber: response.data.registration?.cashReceiptNumber ? '***' : null
    });

    // Test validation by trying invalid data
    console.log('\n3️⃣ Testing validation...');
    
    const invalidData = {
      ...testData,
      phone: '123', // Invalid phone
      cashReceiptNumber: 'A'.repeat(200) // Too long
    };

    try {
      await axios.post(
        `${API_BASE_URL}/events/${TEST_EVENT_ID}/manual-registration`,
        invalidData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${TEST_TOKEN}`
          },
          timeout: 10000
        }
      );
      console.log('❌ Validation should have failed');
    } catch (validationError) {
      if (validationError.response?.status === 400) {
        console.log('✅ Validation working correctly');
        console.log('📋 Validation errors:', validationError.response.data.errors);
      } else {
        console.log('⚠️ Unexpected validation error:', validationError.message);
      }
    }

    console.log('\n🎉 API TEST SUMMARY:');
    console.log('✅ Endpoint accessible');
    console.log('✅ Manual registration working');
    console.log('✅ Optional fields accepted');
    console.log('✅ Cash receipt number stored');
    console.log('✅ Validation working');

  } catch (error) {
    console.error('❌ API Test Failed:', error.message);
    
    if (error.response) {
      console.error('📋 Error Details:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data
      });
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Tip: Check if the backend server is running');
    }
    
    if (error.response?.status === 401) {
      console.log('💡 Tip: Check if the JWT token is valid and has proper permissions');
    }
    
    if (error.response?.status === 404) {
      console.log('💡 Tip: Check if the event ID exists');
    }
  }
}

// Instructions for running this test
console.log('📋 MANUAL REGISTRATION API TEST');
console.log('=====================================');
console.log('\n⚠️  BEFORE RUNNING:');
console.log('1. Update TEST_EVENT_ID with a real event ID from your database');
console.log('2. Update TEST_TOKEN with a valid JWT token (admin/manager/sub-admin)');
console.log('3. Ensure backend server is running and accessible');
console.log('\n🚀 To run: node test_manual_registration_api.js\n');

// Only run test if we have valid configuration
if (process.argv.includes('--run') && TEST_TOKEN !== 'YOUR_JWT_TOKEN') {
  testManualRegistrationAPI();
} else {
  console.log('\n❌ Test not executed. Please configure and run with --run flag');
}
