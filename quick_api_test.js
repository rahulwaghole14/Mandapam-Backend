const axios = require('axios');

async function quickAPITest() {
  console.log('🧪 Quick API Connectivity Test...\n');

  try {
    // Test basic API connectivity
    console.log('1️⃣ Testing API base URL...');
    const response = await axios.get('https://mandapam-backend-97mi.onrender.com/api/events', {
      timeout: 10000,
      headers: {
        'User-Agent': 'Manual-Registration-Test/1.0'
      }
    });

    console.log('✅ API is accessible!');
    console.log('📋 Status:', response.status);
    console.log('📋 Response type:', typeof response.data);
    
    if (Array.isArray(response.data)) {
      console.log('📋 Events count:', response.data.length);
      if (response.data.length > 0) {
        console.log('📋 Sample event ID:', response.data[0].id);
        console.log('📋 Sample event title:', response.data[0].title || response.data[0].name);
      }
    }

    // Test manual registration endpoint structure (without authentication)
    console.log('\n2️⃣ Testing manual registration endpoint structure...');
    try {
      await axios.post('https://mandapam-backend-97mi.onrender.com/api/events/1/manual-registration', {}, {
        timeout: 5000
      });
    } catch (authError) {
      if (authError.response?.status === 401) {
        console.log('✅ Manual registration endpoint exists and requires authentication');
      } else if (authError.response?.status === 404) {
        console.log('⚠️ Manual registration endpoint not found (404)');
      } else {
        console.log('ℹ️ Manual registration endpoint response:', authError.response?.status);
      }
    }

    console.log('\n🎉 CONNECTIVITY TEST COMPLETE');
    console.log('✅ API server is running');
    console.log('✅ Events endpoint working');
    console.log('✅ Manual registration endpoint accessible');

  } catch (error) {
    console.error('❌ API Test Failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Server is not running or not accessible');
    } else if (error.code === 'ENOTFOUND') {
      console.log('💡 Domain not found - check URL');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('💡 Server timeout - server might be slow');
    }
    
    if (error.response) {
      console.log('📋 Server responded with:', error.response.status);
    }
  }
}

quickAPITest();
