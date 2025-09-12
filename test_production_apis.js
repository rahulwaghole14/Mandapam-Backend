const axios = require('axios');

// Test script to verify production APIs are working correctly
async function testProductionAPIs() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTUsInBob25lIjoiOTg4MTk3NjUyNiIsIm5hbWUiOiJyYWh1bCB3YWdob2xlIiwiYnVzaW5lc3NOYW1lIjoiUlNMIFNvbHV0aW9uIFB2dCBMdGQiLCJidXNpbmVzc1R5cGUiOiJjYXRlcmluZyIsImNpdHkiOiJQdW5lIiwiYXNzb2NpYXRpb25OYW1lIjoiUmFpZ2FkIEFzc29jaWF0aW9uIiwiaXNBY3RpdmUiOnRydWUsInVzZXJUeXBlIjoibWVtYmVyIiwiaWF0IjoxNzU3NjU1MjcyLCJleHAiOjE3NTc3NDE2NzJ9.k2igVN3PdOlVBOHvvU8ZDQNOYf6wPsE6eJsjvbByWAc';
  
  // Replace with your production server URL
  const productionURL = 'https://your-production-domain.com'; // Update this with actual URL
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  console.log('=== Testing Production APIs ===\n');

  // Test 1: BOD API
  console.log('1. Testing GET /api/bod (Production)');
  try {
    const bodResponse = await axios.get(`${productionURL}/api/bod?page=1&limit=5`, { 
      headers,
      timeout: 10000 
    });
    
    console.log('✅ BOD API Status:', bodResponse.status);
    console.log('Response structure:');
    console.log('- success:', bodResponse.data.success);
    console.log('- bods array length:', bodResponse.data.bods?.length || 0);
    
    if (bodResponse.data.bods && bodResponse.data.bods.length > 0) {
      const firstBod = bodResponse.data.bods[0];
      console.log('\nFirst BOD member fields:');
      console.log('- Web fields: id, position, phone');
      console.log('  id:', firstBod.id, typeof firstBod.id);
      console.log('  position:', firstBod.position);
      console.log('  phone:', firstBod.phone);
      
      console.log('- Mobile fields: _id, designation, contactNumber');
      console.log('  _id:', firstBod._id, typeof firstBod._id);
      console.log('  designation:', firstBod.designation);
      console.log('  contactNumber:', firstBod.contactNumber);
      console.log('  associationName:', firstBod.associationName);
      
      // Check if mobile fields are present
      const hasMobileFields = firstBod._id && firstBod.designation && firstBod.contactNumber;
      console.log('\n✅ Mobile fields present:', hasMobileFields ? 'YES' : 'NO');
    }
    
  } catch (error) {
    console.log('❌ BOD API Error:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 2: Members API
  console.log('2. Testing GET /api/mobile/members (Production)');
  try {
    const membersResponse = await axios.get(`${productionURL}/api/mobile/members?page=1&limit=5`, { 
      headers,
      timeout: 10000 
    });
    
    console.log('✅ Members API Status:', membersResponse.status);
    console.log('Response structure:');
    console.log('- success:', membersResponse.data.success);
    console.log('- members array length:', membersResponse.data.members?.length || 0);
    
    if (membersResponse.data.members && membersResponse.data.members.length > 0) {
      const firstMember = membersResponse.data.members[0];
      console.log('\nFirst member fields:');
      console.log('- _id:', firstMember._id, typeof firstMember._id);
      console.log('- name:', firstMember.name);
      console.log('- businessName:', firstMember.businessName);
      console.log('- associationName:', firstMember.associationName);
      console.log('- paymentStatus:', firstMember.paymentStatus);
    }
    
  } catch (error) {
    console.log('❌ Members API Error:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test 3: Association API
  console.log('3. Testing GET /api/mobile/associations/8 (Production)');
  try {
    const associationResponse = await axios.get(`${productionURL}/api/mobile/associations/8`, { 
      headers,
      timeout: 10000 
    });
    
    console.log('✅ Association API Status:', associationResponse.status);
    console.log('Association details:');
    console.log('- name:', associationResponse.data.association?.name);
    console.log('- memberCount:', associationResponse.data.association?.memberCount);
    console.log('- city:', associationResponse.data.association?.city);
    
  } catch (error) {
    console.log('❌ Association API Error:');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response:', error.response.data);
    } else {
      console.log('Error:', error.message);
    }
  }

  console.log('\n=== Debugging Tips ===');
  console.log('If APIs are working but mobile app shows fallback data:');
  console.log('1. Check mobile app API calls in network tab');
  console.log('2. Verify mobile app is using correct endpoints');
  console.log('3. Check if mobile app expects different field names');
  console.log('4. Verify mobile app token is valid on production');
}

// Run the tests
testProductionAPIs().catch(console.error);
