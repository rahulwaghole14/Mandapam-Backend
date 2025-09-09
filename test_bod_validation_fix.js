// Test script for BOD/NBOD validation fix
// Run this to verify the current API behavior

const axios = require('axios');

const BASE_URL = 'https://mandapam-backend-97mi.onrender.com';

async function testBODValidation() {
  console.log('🧪 Testing BOD/NBOD validation...\n');

  try {
    // Step 1: Login
    console.log('1️⃣ Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@mandap.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Step 2: Test National BOD (using position/phone)
    console.log('2️⃣ Testing National BOD creation (position/phone)...');
    try {
      const nationalBOD = await axios.post(`${BASE_URL}/api/bod`, {
        name: 'Test National BOD',
        position: 'President',
        phone: '9876543210',
        email: 'national@test.com',
        bio: 'Test National BOD member',
        isActive: true
      }, { headers });

      console.log('✅ National BOD created successfully!');
      console.log(`   ID: ${nationalBOD.data.bod.id}`);
      console.log(`   Association ID: ${nationalBOD.data.bod.associationId}\n`);
    } catch (error) {
      console.log('❌ National BOD creation failed:');
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
      if (error.response?.data?.errors) {
        console.log('   Validation errors:', error.response.data.errors);
      }
      console.log('');
    }

    // Step 3: Test Association BOD (using position/phone)
    console.log('3️⃣ Testing Association BOD creation (position/phone)...');
    try {
      const associationBOD = await axios.post(`${BASE_URL}/api/bod`, {
        name: 'Test Association BOD',
        position: 'Vice President',
        phone: '9876543211',
        email: 'association@test.com',
        bio: 'Test Association BOD member',
        isActive: true,
        associationId: 7
      }, { headers });

      console.log('✅ Association BOD created successfully!');
      console.log(`   ID: ${associationBOD.data.bod.id}`);
      console.log(`   Association ID: ${associationBOD.data.bod.associationId}\n`);
    } catch (error) {
      console.log('❌ Association BOD creation failed:');
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
      if (error.response?.data?.errors) {
        console.log('   Validation errors:', error.response.data.errors);
      }
      console.log('');
    }

    // Step 4: Test with alternative field names (designation/contactNumber)
    console.log('4️⃣ Testing with alternative field names (designation/contactNumber)...');
    try {
      const altBOD = await axios.post(`${BASE_URL}/api/bod`, {
        name: 'Test BOD Alternative Fields',
        designation: 'Secretary',
        contactNumber: '9876543212',
        email: 'alt@test.com',
        isActive: true
      }, { headers });

      console.log('✅ Alternative field names work!');
      console.log(`   ID: ${altBOD.data.bod.id}`);
      console.log(`   Association ID: ${altBOD.data.bod.associationId}\n`);
    } catch (error) {
      console.log('❌ Alternative field names failed:');
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
      if (error.response?.data?.errors) {
        console.log('   Validation errors:', error.response.data.errors);
      }
      console.log('');
    }

    // Step 5: Test BOD retrieval
    console.log('5️⃣ Testing BOD retrieval...');
    try {
      const allBODs = await axios.get(`${BASE_URL}/api/bod`, { headers });
      const nationalBODs = await axios.get(`${BASE_URL}/api/bod?type=national`, { headers });
      const associationBODs = await axios.get(`${BASE_URL}/api/bod?type=association`, { headers });

      console.log('✅ BOD retrieval working:');
      console.log(`   Total BODs: ${allBODs.data.count}`);
      console.log(`   National BODs: ${nationalBODs.data.count}`);
      console.log(`   Association BODs: ${associationBODs.data.count}\n`);
    } catch (error) {
      console.log('❌ BOD retrieval failed:');
      console.log(`   Error: ${error.response?.data?.message || error.message}\n`);
    }

    console.log('🎉 BOD/NBOD validation testing completed!');

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

// Run the test
testBODValidation();
