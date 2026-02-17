const axios = require('axios');

const BASE_URL = 'https://mandapam-backend-97mi.onrender.com';

async function testAssociationList() {
  console.log('🔍 Testing Association List API...\n');

  try {
    // Get token first
    await axios.post(`${BASE_URL}/api/mobile/send-otp`, {
      mobileNumber: '9876543210'
    });
    
    const verifyResponse = await axios.post(`${BASE_URL}/api/mobile/verify-otp`, {
      mobileNumber: '9876543210',
      otp: '123456'
    });
    const token = verifyResponse.data.token;
    
    // Test the association list API
    console.log('1. Testing /api/mobile/associations...');
    try {
      const response = await axios.get(`${BASE_URL}/api/mobile/associations?limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Association list works:', response.status);
      console.log('Response structure:', {
        success: response.data.success,
        count: response.data.count,
        total: response.data.total,
        page: response.data.page,
        pages: response.data.pages
      });
      
      const associations = response.data.associations;
      console.log(`\nFound ${associations.length} associations:`);
      
      associations.forEach((association, index) => {
        console.log(`\n${index + 1}. Association Details:`);
        console.log(`   ID: ${association.id}`);
        console.log(`   Name: ${association.name}`);
        console.log(`   Description: ${association.description || 'No description'}`);
        console.log(`   City: ${association.city || 'No city'}`);
        console.log(`   State: ${association.state || 'No state'}`);
        console.log(`   Phone: ${association.phone || 'No phone'}`);
        console.log(`   Email: ${association.email || 'No email'}`);
        console.log(`   Website: ${association.website || 'No website'}`);
        console.log(`   Registration Number: ${association.registrationNumber || 'No reg number'}`);
        console.log(`   Established Year: ${association.establishedYear || 'No year'}`);
        console.log(`   Is Active: ${association.isActive}`);
        console.log(`   Total Members: ${association.totalMembers || 0}`);
        console.log(`   Total Vendors: ${association.totalVendors || 0}`);
        console.log(`   Created: ${association.created_at}`);
        console.log(`   Updated: ${association.updated_at}`);
      });
      
    } catch (error) {
      console.log('❌ Association list failed:', error.response?.status, error.response?.data?.message);
      console.log('Full error response:', JSON.stringify(error.response?.data, null, 2));
    }

    // Test association detail API for comparison
    console.log('\n2. Testing association detail APIs...');
    const testIds = [1, 2, 3, 4];
    
    for (const id of testIds) {
      try {
        const response = await axios.get(`${BASE_URL}/api/mobile/associations/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`✅ Association ID ${id}: ${response.status} - ${response.data.association?.name || 'No name'}`);
      } catch (error) {
        console.log(`❌ Association ID ${id}: ${error.response?.status} - ${error.response?.data?.message || error.message}`);
      }
    }

    // Test association search
    console.log('\n3. Testing association search...');
    try {
      const searchResponse = await axios.get(`${BASE_URL}/api/mobile/associations/search?q=Mumbai`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Association search works:', searchResponse.status, 'Count:', searchResponse.data.count);
    } catch (error) {
      console.log('❌ Association search failed:', error.response?.status, error.response?.data?.message);
    }

    // Test association stats
    console.log('\n4. Testing association stats...');
    try {
      const statsResponse = await axios.get(`${BASE_URL}/api/mobile/associations/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Association stats works:', statsResponse.status);
      console.log('Stats:', JSON.stringify(statsResponse.data.stats, null, 2));
    } catch (error) {
      console.log('❌ Association stats failed:', error.response?.status, error.response?.data?.message);
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testAssociationList();

