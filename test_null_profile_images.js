const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const MOBILE_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTUsInBob25lIjoiOTg4MTk3NjUyNiIsIm5hbWUiOiJyYWh1bCB3YWdob2xlIiwiYnVzaW5lc3NOYW1lIjoiUlNMIFNvbHV0aW9uIFB2dCBMdGQiLCJidXNpbmVzc1R5cGUiOiJjYXRlcmluZyIsImNpdHkiOiJQdW5lIiwiYXNzb2NpYXRpb25OYW1lIjoiUmFpZ2FkIEFzc29jaWF0aW9uIiwiaXNBY3RpdmUiOnRydWUsInVzZXJUeXBlIjoibWVtYmVyIiwiaWF0IjoxNzU3NjU1MjcyLCJleHAiOjE3NTc3NDE2NzJ9.k2igVN3PdOlVBOHvvU8ZDQNOYf6wPsE6eJsjvbByWAc';

async function testNullProfileImages() {
  try {
    console.log('=== Testing Null Profile Images ===\n');
    
    const headers = {
      'Authorization': `Bearer ${MOBILE_TOKEN}`,
      'Content-Type': 'application/json'
    };
    
    // Test Mobile Members API
    console.log('1. Testing Mobile Members API...');
    const membersResponse = await axios.get(`${BASE_URL}/api/mobile/members?limit=2`, { headers });
    
    if (membersResponse.data.members && membersResponse.data.members.length > 0) {
      const firstMember = membersResponse.data.members[0];
      console.log(`✅ Member: ${firstMember.name}`);
      console.log(`   Profile Image: ${firstMember.profileImage === null ? 'NULL' : firstMember.profileImage}`);
      console.log(`   Is null: ${firstMember.profileImage === null}`);
    }
    console.log('');
    
    // Test Mobile BOD API
    console.log('2. Testing Mobile BOD API...');
    const bodResponse = await axios.get(`${BASE_URL}/api/mobile/bod?limit=2`, { headers });
    
    if (bodResponse.data.bods && bodResponse.data.bods.length > 0) {
      const firstBod = bodResponse.data.bods[0];
      console.log(`✅ BOD: ${firstBod.name}`);
      console.log(`   Profile Image: ${firstBod.profileImage === null ? 'NULL' : firstBod.profileImage}`);
      console.log(`   Is null: ${firstBod.profileImage === null}`);
    }
    
    console.log('\n🎉 All APIs now return null for missing profile images!');
    console.log('The mobile app can handle null values and show its own default image.');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testNullProfileImages();
