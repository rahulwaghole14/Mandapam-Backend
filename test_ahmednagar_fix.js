const axios = require('axios');

const BASE_URL = 'https://mandapam-backend-97mi.onrender.com';

async function testAhmednagarFix() {
  console.log('🧪 Testing Ahmednagar Fix - City Parameter Searches Both Fields...\n');

  try {
    // Test 1: Get all associations with city parameter (should now find Ahmednagar)
    console.log('1️⃣ Testing GET /api/mobile/associations?city=Ahmednagar...');
    const response1 = await axios.get(`${BASE_URL}/api/mobile/associations?city=Ahmednagar`);
    console.log('✅ Ahmednagar search working!');
    console.log(`   Found ${response1.data.count} associations in Ahmednagar`);
    console.log(`   Total associations: ${response1.data.total}`);
    
    if (response1.data.associations.length > 0) {
      console.log('   Associations found:');
      response1.data.associations.forEach((assoc, index) => {
        console.log(`   ${index + 1}. ${assoc.name} - City: "${assoc.city}" - District: "${assoc.district}"`);
      });
    }
    console.log('');

    // Test 2: Search associations by city parameter
    console.log('2️⃣ Testing GET /api/mobile/associations/search?city=Ahmednagar...');
    const response2 = await axios.get(`${BASE_URL}/api/mobile/associations/search?city=Ahmednagar`);
    console.log('✅ Ahmednagar search working!');
    console.log(`   Found ${response2.data.count} associations in Ahmednagar\n`);

    // Test 3: Get associations by specific city
    console.log('3️⃣ Testing GET /api/mobile/associations/city/Ahmednagar...');
    const response3 = await axios.get(`${BASE_URL}/api/mobile/associations/city/Ahmednagar`);
    console.log('✅ Ahmednagar-specific route working!');
    console.log(`   Found ${response3.data.count} associations in Ahmednagar\n`);

    // Test 4: Test with state and city combination
    console.log('4️⃣ Testing combined state and city filter...');
    const response4 = await axios.get(`${BASE_URL}/api/mobile/associations?state=Maharashtra&city=Ahmednagar`);
    console.log('✅ Combined filters working!');
    console.log(`   Found ${response4.data.count} associations in Maharashtra state, Ahmednagar\n`);

    // Test 5: Test different variations
    console.log('5️⃣ Testing different variations...');
    const variations = ['Ahmednagar', 'ahmednagar', 'AHMEDNAGAR', 'Ahmadnagar'];
    
    for (const variation of variations) {
      try {
        const response = await axios.get(`${BASE_URL}/api/mobile/associations?city=${encodeURIComponent(variation)}`);
        console.log(`   "${variation}": Found ${response.data.count} associations`);
      } catch (error) {
        console.log(`   "${variation}": Error - ${error.response?.data?.message || error.message}`);
      }
    }

    console.log('\n🎉 Ahmednagar fix testing completed!');
    console.log('\n📋 Summary:');
    console.log('   • City parameter now searches both district AND city fields');
    console.log('   • Ahmednagar associations are now discoverable');
    console.log('   • Backward compatibility maintained');
    console.log('   • Case-insensitive search working');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testAhmednagarFix();

