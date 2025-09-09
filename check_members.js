// Check existing members in database
const axios = require('axios');

const BASE_URL = 'https://mandapam-backend-97mi.onrender.com';

async function checkExistingMembers() {
  try {
    // Login as admin
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@mandap.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Get all members
    const membersResponse = await axios.get(`${BASE_URL}/api/members?limit=100`, { headers });
    
    console.log('📊 Existing Members in Database:');
    console.log(`Total: ${membersResponse.data.count}`);
    console.log('');
    
    membersResponse.data.members.forEach((member, index) => {
      console.log(`${index + 1}. Name: ${member.name}`);
      console.log(`   Phone: "${member.phone}"`);
      console.log(`   Email: ${member.email}`);
      console.log(`   Business: ${member.businessName}`);
      console.log(`   City: ${member.city}`);
      console.log('');
    });

  } catch (error) {
    console.log('❌ Error:', error.response?.data?.message || error.message);
  }
}

checkExistingMembers();
