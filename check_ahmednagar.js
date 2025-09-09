const axios = require('axios');

const BASE_URL = 'https://mandapam-backend-97mi.onrender.com';

async function checkAhmednagarInCity() {
  console.log('🔍 Checking for Ahmednagar in city field...\n');

  try {
    // Get all associations
    const allAssociations = await axios.get(`${BASE_URL}/api/mobile/associations`);
    console.log(`Total associations: ${allAssociations.data.total}\n`);
    
    // Filter associations that have "ahmednagar" in city field
    const ahmadnagarAssociations = allAssociations.data.associations.filter(assoc => 
      assoc.city && assoc.city.toLowerCase().includes('ahmednagar')
    );
    
    console.log(`Found ${ahmadnagarAssociations.length} associations with "ahmednagar" in city field:`);
    
    ahmadnagarAssociations.forEach((assoc, index) => {
      console.log(`${index + 1}. ${assoc.name}`);
      console.log(`   City: "${assoc.city}"`);
      console.log(`   District: "${assoc.district}"`);
      console.log(`   State: "${assoc.state}"`);
      console.log('');
    });
    
    // Test the old logic (searching city field directly)
    console.log('Testing if we can find them by searching city field directly...');
    
    // Let's test with the exact city name from the database
    if (ahmadnagarAssociations.length > 0) {
      const cityName = ahmadnagarAssociations[0].city;
      console.log(`Testing with exact city name: "${cityName}"`);
      
      // This should work if we search the city field directly
      const directCitySearch = await axios.get(`${BASE_URL}/api/mobile/associations?city=${encodeURIComponent(cityName)}`);
      console.log(`Direct city search results: ${directCitySearch.data.count}`);
    }

  } catch (error) {
    console.error('❌ Check failed:', error.response?.data || error.message);
  }
}

// Run the check
checkAhmednagarInCity();
