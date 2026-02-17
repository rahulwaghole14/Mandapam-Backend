const axios = require('axios');

const BASE_URL = 'http://localhost:5000';
const MOBILE_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTUsInBob25lIjoiOTg4MTk3NjUyNiIsIm5hbWUiOiJyYWh1bCB3YWdob2xlIiwiYnVzaW5lc3NOYW1lIjoiUlNMIFNvbHV0aW9uIFB2dCBMdGQiLCJidXNpbmVzc1R5cGUiOiJjYXRlcmluZyIsImNpdHkiOiJQdW5lIiwiYXNzb2NpYXRpb25OYW1lIjoiUmFpZ2FkIEFzc29jaWF0aW9uIiwiaXNBY3RpdmUiOnRydWUsInVzZXJUeXBlIjoibWVtYmVyIiwiaWF0IjoxNzU3NjU1MjcyLCJleHAiOjE3NTc3NDE2NzJ9.k2igVN3PdOlVBOHvvU8ZDQNOYf6wPsE6eJsjvbByWAc';

async function testAppUpdateAPIs() {
  try {
    console.log('=== Testing App Update APIs ===\n');
    
    const headers = {
      'Authorization': `Bearer ${MOBILE_TOKEN}`,
      'Content-Type': 'application/json',
      'X-App-Version': '1.0.0',
      'X-Platform': 'android'
    };
    
    // Test 1: Update Check API
    console.log('1. Testing Update Check API...');
    console.log('   Endpoint: GET /api/mobile/app/update-check');
    console.log('   Headers:', { 'X-App-Version': '1.0.0', 'X-Platform': 'android' });
    
    const updateCheckResponse = await axios.get(`${BASE_URL}/api/mobile/app/update-check`, { headers });
    
    console.log('✅ Update Check Response:');
    console.log(`   Status: ${updateCheckResponse.status}`);
    console.log(`   Success: ${updateCheckResponse.data.success}`);
    console.log(`   Current Version: ${updateCheckResponse.data.data.currentVersion}`);
    console.log(`   Latest Version: ${updateCheckResponse.data.data.latestVersion}`);
    console.log(`   Update Available: ${updateCheckResponse.data.data.updateAvailable}`);
    console.log(`   Force Update: ${updateCheckResponse.data.data.forceUpdate}`);
    console.log(`   Update URL: ${updateCheckResponse.data.data.updateUrl}`);
    console.log('');
    
    // Test 2: Version Info API
    console.log('2. Testing Version Info API...');
    console.log('   Endpoint: GET /api/mobile/app/version');
    console.log('   Headers:', { 'X-App-Version': '1.0.0', 'X-Platform': 'android' });
    
    const versionInfoResponse = await axios.get(`${BASE_URL}/api/mobile/app/version`, { headers });
    
    console.log('✅ Version Info Response:');
    console.log(`   Status: ${versionInfoResponse.status}`);
    console.log(`   Success: ${versionInfoResponse.data.success}`);
    console.log(`   Current Version: ${versionInfoResponse.data.data.currentVersion}`);
    console.log(`   Latest Version: ${versionInfoResponse.data.data.latestVersion}`);
    console.log(`   Update Available: ${versionInfoResponse.data.data.updateAvailable}`);
    console.log(`   Force Update: ${versionInfoResponse.data.data.forceUpdate}`);
    console.log(`   Release Notes: ${versionInfoResponse.data.data.releaseNotes.substring(0, 50)}...`);
    console.log('');
    
    // Test 3: Test with different version (should show no update)
    console.log('3. Testing with latest version (should show no update)...');
    const latestVersionHeaders = {
      ...headers,
      'X-App-Version': '1.1.0'
    };
    
    const noUpdateResponse = await axios.get(`${BASE_URL}/api/mobile/app/update-check`, { 
      headers: latestVersionHeaders 
    });
    
    console.log('✅ No Update Response:');
    console.log(`   Current Version: ${noUpdateResponse.data.data.currentVersion}`);
    console.log(`   Latest Version: ${noUpdateResponse.data.data.latestVersion}`);
    console.log(`   Update Available: ${noUpdateResponse.data.data.updateAvailable}`);
    console.log('');
    
    // Test 4: Test with iOS platform
    console.log('4. Testing with iOS platform...');
    const iosHeaders = {
      ...headers,
      'X-Platform': 'ios'
    };
    
    const iosResponse = await axios.get(`${BASE_URL}/api/mobile/app/update-check`, { 
      headers: iosHeaders 
    });
    
    console.log('✅ iOS Response:');
    console.log(`   Platform: iOS`);
    console.log(`   Update URL: ${iosResponse.data.data.updateUrl}`);
    console.log('');
    
    console.log('🎉 All App Update APIs are working correctly!');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.status === 500) {
      console.log('💡 Make sure to run the database migration script first:');
      console.log('   node scripts/create-app-versions-table.js');
    }
  }
}

testAppUpdateAPIs();
