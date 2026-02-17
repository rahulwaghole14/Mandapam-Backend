const axios = require('axios');

const BASE_URL = 'https://mandapam-backend-97mi.onrender.com';

async function debugAhmadnagarIssue() {
  console.log('🔍 Debugging Ahmadnagar District Search Issue...\n');

  try {
    // Test 1: Get all associations to see what's in the database
    console.log('1️⃣ Getting all associations to check data...');
    const allAssociations = await axios.get(`${BASE_URL}/api/mobile/associations`);
    console.log(`   Total associations in database: ${allAssociations.data.total}`);
    
    if (allAssociations.data.associations.length > 0) {
      console.log('   Sample associations:');
      allAssociations.data.associations.slice(0, 3).forEach((assoc, index) => {
        console.log(`   ${index + 1}. ${assoc.name} - City: "${assoc.city}" - District: "${assoc.district}" - State: "${assoc.state}"`);
      });
    }
    console.log('');

    // Test 2: Try different search approaches
    console.log('2️⃣ Testing different search approaches...');
    
    // Test with exact case
    const exactCase = await axios.get(`${BASE_URL}/api/mobile/associations?city=Ahmadnagar`);
    console.log(`   Exact case "Ahmadnagar": ${exactCase.data.count} results`);
    
    // Test with lowercase
    const lowerCase = await axios.get(`${BASE_URL}/api/mobile/associations?city=ahmadnagar`);
    console.log(`   Lowercase "ahmadnagar": ${lowerCase.data.count} results`);
    
    // Test with uppercase
    const upperCase = await axios.get(`${BASE_URL}/api/mobile/associations?city=AHMADNAGAR`);
    console.log(`   Uppercase "AHMADNAGAR": ${upperCase.data.count} results`);
    
    // Test with partial match
    const partialMatch = await axios.get(`${BASE_URL}/api/mobile/associations?city=Ahmad`);
    console.log(`   Partial match "Ahmad": ${partialMatch.data.count} results`);
    
    // Test with space
    const withSpace = await axios.get(`${BASE_URL}/api/mobile/associations?city=Ahmad Nagar`);
    console.log(`   With space "Ahmad Nagar": ${withSpace.data.count} results`);
    
    console.log('');

    // Test 3: Check if the issue is with the field mapping
    console.log('3️⃣ Testing if associations exist with city field instead of district...');
    
    // Let's check if there are associations with city field containing Ahmadnagar
    const cityFieldTest = await axios.get(`${BASE_URL}/api/mobile/associations`);
    const ahmadnagarInCity = cityFieldTest.data.associations.filter(assoc => 
      assoc.city && assoc.city.toLowerCase().includes('ahmadnagar')
    );
    const ahmadnagarInDistrict = cityFieldTest.data.associations.filter(assoc => 
      assoc.district && assoc.district.toLowerCase().includes('ahmadnagar')
    );
    
    console.log(`   Associations with "ahmadnagar" in city field: ${ahmadnagarInCity.length}`);
    console.log(`   Associations with "ahmadnagar" in district field: ${ahmadnagarInDistrict.length}`);
    
    if (ahmadnagarInCity.length > 0) {
      console.log('   Found associations in city field:');
      ahmadnagarInCity.forEach((assoc, index) => {
        console.log(`   ${index + 1}. ${assoc.name} - City: "${assoc.city}" - District: "${assoc.district}"`);
      });
    }
    
    if (ahmadnagarInDistrict.length > 0) {
      console.log('   Found associations in district field:');
      ahmadnagarInDistrict.forEach((assoc, index) => {
        console.log(`   ${index + 1}. ${assoc.name} - City: "${assoc.city}" - District: "${assoc.district}"`);
      });
    }
    
    console.log('');

    // Test 4: Test the search endpoint specifically
    console.log('4️⃣ Testing search endpoint...');
    const searchTest = await axios.get(`${BASE_URL}/api/mobile/associations/search?q=Ahmadnagar`);
    console.log(`   Search with q=Ahmadnagar: ${searchTest.data.count} results`);
    
    const searchTest2 = await axios.get(`${BASE_URL}/api/mobile/associations/search?q=ahmadnagar`);
    console.log(`   Search with q=ahmadnagar: ${searchTest2.data.count} results`);

  } catch (error) {
    console.error('❌ Debug failed:', error.response?.data || error.message);
  }
}

// Run the debug
debugAhmadnagarIssue();
