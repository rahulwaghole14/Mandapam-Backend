const axios = require('axios');

const BASE_URL = 'https://mandapam-backend-97mi.onrender.com';

async function testBasicEndpoint() {
  console.log('🔍 Testing basic endpoint to check if associations exist...\n');

  try {
    // Test 1: Get all associations
    console.log('1️⃣ Getting all associations...');
    const allAssociations = await axios.get(`${BASE_URL}/api/mobile/associations`);
    console.log(`   Total associations: ${allAssociations.data.total}`);
    
    if (allAssociations.data.associations.length > 0) {
      console.log('   First few associations:');
      allAssociations.data.associations.slice(0, 5).forEach((assoc, index) => {
        console.log(`   ${index + 1}. ${assoc.name} - City: "${assoc.city}" - District: "${assoc.district}" - State: "${assoc.state}"`);
      });
      
      // Check if any have Ahmednagar in city field
      const ahmadnagarAssociations = allAssociations.data.associations.filter(assoc => 
        assoc.city && assoc.city.toLowerCase().includes('ahmednagar')
      );
      console.log(`\n   Associations with "ahmednagar" in city field: ${ahmadnagarAssociations.length}`);
      
      if (ahmadnagarAssociations.length > 0) {
        ahmadnagarAssociations.forEach((assoc, index) => {
          console.log(`   ${index + 1}. ${assoc.name} - City: "${assoc.city}" - District: "${assoc.district}"`);
        });
      }
    }
    console.log('');

    // Test 2: Try a simple search without city parameter
    console.log('2️⃣ Testing search without city parameter...');
    const searchTest = await axios.get(`${BASE_URL}/api/mobile/associations/search?q=Ahmednagar`);
    console.log(`   Search results: ${searchTest.data.count}`);
    
    if (searchTest.data.associations.length > 0) {
      searchTest.data.associations.forEach((assoc, index) => {
        console.log(`   ${index + 1}. ${assoc.name} - City: "${assoc.city}" - District: "${assoc.district}"`);
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testBasicEndpoint();

