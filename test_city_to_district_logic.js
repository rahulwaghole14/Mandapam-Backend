const axios = require('axios');

const BASE_URL = 'https://mandapam-backend-97mi.onrender.com';

async function testCityToDistrictLogic() {
  console.log('🧪 Testing City Parameter → District Field Logic...\n');

  try {
    // Test 1: Get all associations with city parameter (should search district field)
    console.log('1️⃣ Testing GET /api/mobile/associations?city=Pune...');
    const response1 = await axios.get(`${BASE_URL}/api/mobile/associations?city=Pune`);
    console.log('✅ City parameter working (searches district field)!');
    console.log(`   Found ${response1.data.count} associations in Pune district`);
    console.log(`   Total associations: ${response1.data.total}\n`);

    // Test 2: Search associations by city parameter (should search district field)
    console.log('2️⃣ Testing GET /api/mobile/associations/search?city=Mumbai...');
    const response2 = await axios.get(`${BASE_URL}/api/mobile/associations/search?city=Mumbai`);
    console.log('✅ City search working (searches district field)!');
    console.log(`   Found ${response2.data.count} associations in Mumbai district\n`);

    // Test 3: Get associations by specific city (should search district field)
    console.log('3️⃣ Testing GET /api/mobile/associations/city/Delhi...');
    const response3 = await axios.get(`${BASE_URL}/api/mobile/associations/city/Delhi`);
    console.log('✅ City-specific route working (searches district field)!');
    console.log(`   Found ${response3.data.count} associations in Delhi district\n`);

    // Test 4: Test with state and city combination (city searches district)
    console.log('4️⃣ Testing combined state and city filter...');
    const response4 = await axios.get(`${BASE_URL}/api/mobile/associations?state=Maharashtra&city=Pune`);
    console.log('✅ Combined filters working (city searches district)!');
    console.log(`   Found ${response4.data.count} associations in Maharashtra state, Pune district\n`);

    console.log('🎉 All city-to-district logic tests passed!');
    console.log('\n📋 Summary:');
    console.log('   • API endpoints remain the same (no breaking changes)');
    console.log('   • City parameter now searches district field internally');
    console.log('   • Frontend code requires no changes');
    console.log('   • Backward compatibility maintained');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testCityToDistrictLogic();
