// Test public association list API
const axios = require('axios');

const BASE_URL = 'https://mandapam-backend-97mi.onrender.com';

async function testPublicAssociations() {
  console.log('🔍 Testing Public Association List API...\n');

  try {
    // Test 1: Get all associations (should work without token)
    console.log('1️⃣ Testing GET /api/mobile/associations (no token)...');
    try {
      const response = await axios.get(`${BASE_URL}/api/mobile/associations?limit=3`);
      console.log('✅ SUCCESS: Public association API working!');
      console.log(`   Status: ${response.status}`);
      console.log(`   Count: ${response.data.count}`);
      console.log(`   Total: ${response.data.total}`);
      console.log(`   Associations found: ${response.data.associations.length}`);
      
      if (response.data.associations.length > 0) {
        console.log('   Sample association:');
        console.log(`   - Name: ${response.data.associations[0].name}`);
        console.log(`   - City: ${response.data.associations[0].city}`);
        console.log(`   - State: ${response.data.associations[0].state}`);
      }
      console.log('');
    } catch (error) {
      console.log('❌ FAILED: Public association API not working');
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
      console.log(`   Status: ${error.response?.status || 'No response'}`);
      console.log('');
    }

    // Test 2: Search associations (should work without token)
    console.log('2️⃣ Testing GET /api/mobile/associations/search (no token)...');
    try {
      const response = await axios.get(`${BASE_URL}/api/mobile/associations/search?q=Mumbai`);
      console.log('✅ SUCCESS: Public association search API working!');
      console.log(`   Status: ${response.status}`);
      console.log(`   Count: ${response.data.count}`);
      console.log('');
    } catch (error) {
      console.log('❌ FAILED: Public association search API not working');
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
      console.log('');
    }

    // Test 3: Get associations by city (should work without token)
    console.log('3️⃣ Testing GET /api/mobile/associations/city/Mumbai (no token)...');
    try {
      const response = await axios.get(`${BASE_URL}/api/mobile/associations/city/Mumbai`);
      console.log('✅ SUCCESS: Public association by city API working!');
      console.log(`   Status: ${response.status}`);
      console.log(`   Count: ${response.data.count}`);
      console.log('');
    } catch (error) {
      console.log('❌ FAILED: Public association by city API not working');
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
      console.log('');
    }

    // Test 4: Try to access private endpoint (should fail without token)
    console.log('4️⃣ Testing GET /api/mobile/associations/stats (should fail without token)...');
    try {
      const response = await axios.get(`${BASE_URL}/api/mobile/associations/stats`);
      console.log('❌ UNEXPECTED: Private API worked without token!');
      console.log(`   Status: ${response.status}`);
    } catch (error) {
      console.log('✅ EXPECTED: Private API correctly requires authentication');
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
      console.log(`   Status: ${error.response?.status || 'No response'}`);
    }

    console.log('\n🎉 Public Association API testing completed!');

  } catch (error) {
    console.log('❌ Test failed:', error.message);
  }
}

// Run the test
testPublicAssociations();
