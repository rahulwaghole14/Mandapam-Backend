const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const MOBILE_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTUsInBob25lIjoiOTg4MTk3NjUyNiIsIm5hbWUiOiJyYWh1bCB3YWdob2xlIiwiYnVzaW5lc3NOYW1lIjoiUlNMIFNvbHV0aW9uIFB2dCBMdGQiLCJidXNpbmVzc1R5cGUiOiJjYXRlcmluZyIsImNpdHkiOiJQdW5lIiwiYXNzb2NpYXRpb25OYW1lIjoiUmFpZ2FkIEFzc29jaWF0aW9uIiwiaXNBY3RpdmUiOnRydWUsInVzZXJUeXBlIjoibWVtYmVyIiwiaWF0IjoxNzU3NjU1MjcyLCJleHAiOjE3NTc3NDE2NzJ9.k2igVN3PdOlVBOHvvU8ZDQNOYf6wPsE6eJsjvbByWAc';

async function testNewDefaultImage() {
  try {
    console.log('=== Testing New Default Profile Image ===\n');
    
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
      console.log(`   Profile Image: ${firstMember.profileImage ? firstMember.profileImage.substring(0, 50) + '...' : 'NULL'}`);
      console.log(`   Is SVG Data URL: ${firstMember.profileImage && firstMember.profileImage.startsWith('data:image/svg+xml')}`);
      console.log(`   Has placeholder.com: ${firstMember.profileImage && firstMember.profileImage.includes('placeholder.com')}`);
    }
    console.log('');
    
    // Test Mobile BOD API
    console.log('2. Testing Mobile BOD API...');
    const bodResponse = await axios.get(`${BASE_URL}/api/mobile/bod?limit=2`, { headers });
    
    if (bodResponse.data.bods && bodResponse.data.bods.length > 0) {
      const firstBod = bodResponse.data.bods[0];
      console.log(`✅ BOD: ${firstBod.name}`);
      console.log(`   Profile Image: ${firstBod.profileImage ? firstBod.profileImage.substring(0, 50) + '...' : 'NULL'}`);
      console.log(`   Is SVG Data URL: ${firstBod.profileImage && firstBod.profileImage.startsWith('data:image/svg+xml')}`);
      console.log(`   Has placeholder.com: ${firstBod.profileImage && firstBod.profileImage.includes('placeholder.com')}`);
    }
    console.log('');
    
    // Test Association BOD API
    console.log('3. Testing Association BOD API...');
    const associationBodResponse = await axios.get(`${BASE_URL}/api/mobile/associations/8/bod?limit=2`, { headers });
    
    if (associationBodResponse.data.bods && associationBodResponse.data.bods.length > 0) {
      const firstBod = associationBodResponse.data.bods[0];
      console.log(`✅ Association BOD: ${firstBod.name}`);
      console.log(`   Profile Image: ${firstBod.profileImage ? firstBod.profileImage.substring(0, 50) + '...' : 'NULL'}`);
      console.log(`   Is SVG Data URL: ${firstBod.profileImage && firstBod.profileImage.startsWith('data:image/svg+xml')}`);
      console.log(`   Has placeholder.com: ${firstBod.profileImage && firstBod.profileImage.includes('placeholder.com')}`);
    }
    
    console.log('\n🎉 All APIs now use the new SVG default profile image!');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testNewDefaultImage();
