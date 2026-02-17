// Debug script for mobile registration issue
const axios = require('axios');

const BASE_URL = 'https://mandapam-backend-97mi.onrender.com';

async function debugMobileRegistration() {
  console.log('🔍 Debugging Mobile Registration Issue...\n');

  try {
    // Step 1: Login as admin to check existing members
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@mandap.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Admin login successful\n');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Step 2: Check existing members
    console.log('2️⃣ Checking existing members...');
    try {
      const membersResponse = await axios.get(`${BASE_URL}/api/members?limit=50`, { headers });
      console.log(`📊 Found ${membersResponse.data.count} existing members:`);
      
      membersResponse.data.members.forEach((member, index) => {
        console.log(`   ${index + 1}. ${member.name} - Phone: ${member.phone} - Email: ${member.email}`);
      });
      console.log('');
    } catch (error) {
      console.log('❌ Error fetching members:', error.response?.data?.message || error.message);
      console.log('');
    }

    // Step 3: Test mobile registration with a unique phone number
    console.log('3️⃣ Testing mobile registration with unique phone number...');
    const testPhone = `9876543${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    console.log(`   Using test phone: ${testPhone}`);
    
    try {
      const registrationResponse = await axios.post(`${BASE_URL}/api/mobile/register`, {
        name: 'Test Mobile User',
        businessName: 'Test Business',
        businessType: 'sound',
        phone: testPhone,
        city: 'Mumbai',
        pincode: '400001',
        associationName: 'Mumbai Mandap Association',
        state: 'Maharashtra',
        email: `test${Date.now()}@example.com`,
        birthDate: '1990-01-01'
      });

      console.log('✅ Mobile registration successful!');
      console.log(`   Member ID: ${registrationResponse.data.member.id}`);
      console.log(`   Phone: ${registrationResponse.data.member.phone}`);
      console.log(`   Email: ${registrationResponse.data.member.email}\n`);
    } catch (error) {
      console.log('❌ Mobile registration failed:');
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
      if (error.response?.data?.errors) {
        console.log('   Validation errors:', error.response.data.errors);
      }
      console.log('');
    }

    // Step 4: Test mobile registration with existing phone number
    console.log('4️⃣ Testing mobile registration with existing phone number...');
    try {
      const existingPhoneResponse = await axios.post(`${BASE_URL}/api/mobile/register`, {
        name: 'Another Test User',
        businessName: 'Another Test Business',
        businessType: 'catering',
        phone: '9876543210', // This should already exist
        city: 'Pune',
        pincode: '411001',
        associationName: 'Pune Mandap Association',
        state: 'Maharashtra',
        email: 'another@example.com',
        birthDate: '1985-05-15'
      });

      console.log('❌ This should have failed but succeeded!');
    } catch (error) {
      console.log('✅ Expected error for existing phone number:');
      console.log(`   Error: ${error.response?.data?.message || error.message}\n`);
    }

    // Step 5: Check validation requirements
    console.log('5️⃣ Testing validation requirements...');
    try {
      const invalidResponse = await axios.post(`${BASE_URL}/api/mobile/register`, {
        name: 'Invalid Test',
        businessName: 'Invalid Business',
        // Missing required fields
        phone: '1234567890',
        city: 'Mumbai',
        pincode: '400001',
        associationName: 'Mumbai Mandap Association',
        state: 'Maharashtra'
      });

      console.log('❌ This should have failed validation but succeeded!');
    } catch (error) {
      console.log('✅ Expected validation error:');
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
      if (error.response?.data?.errors) {
        console.log('   Validation errors:', error.response.data.errors);
      }
      console.log('');
    }

    console.log('🎉 Mobile registration debugging completed!');

  } catch (error) {
    console.log('❌ Debug failed:', error.message);
  }
}

// Run the debug
debugMobileRegistration();
