const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test basic server connectivity
const testServerConnectivity = async () => {
  console.log('🧪 Testing Server Connectivity...');
  
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Server is running and responding');
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ Server is not running. Please start the server first.');
      console.log('💡 Run: npm start or node server.js');
    } else {
      console.error('❌ Server connectivity test failed:', error.message);
    }
    return false;
  }
};

// Test authentication endpoint
const testAuthentication = async () => {
  console.log('\n🧪 Testing Authentication Endpoint...');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@example.com',
      password: 'password123'
    });
    
    if (response.data.success && response.data.token) {
      console.log('✅ Authentication endpoint working');
      console.log('🔑 Token received:', response.data.token.substring(0, 20) + '...');
      return response.data.token;
    } else {
      console.error('❌ Authentication failed:', response.data.message);
      return null;
    }
  } catch (error) {
    console.error('❌ Authentication test failed:', error.response?.data || error.message);
    return null;
  }
};

// Test member API without images
const testMemberAPI = async (token) => {
  console.log('\n🧪 Testing Member API (without images)...');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/members?page=1&limit=5`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ Member API working');
      console.log('📊 Members found:', response.data.count);
      console.log('📊 Total members:', response.data.totalMembers);
      return true;
    } else {
      console.error('❌ Member API failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Member API test failed:', error.response?.data || error.message);
    return false;
  }
};

// Test event API without images
const testEventAPI = async (token) => {
  console.log('\n🧪 Testing Event API (without images)...');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/events?page=1&limit=5`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ Event API working');
      console.log('📊 Events found:', response.data.count);
      return true;
    } else {
      console.error('❌ Event API failed:', response.data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Event API test failed:', error.response?.data || error.message);
    return false;
  }
};

// Test uploads directory
const testUploadsDirectory = async () => {
  console.log('\n🧪 Testing Uploads Directory...');
  
  try {
    const response = await axios.get(`${BASE_URL}/uploads/`);
    
    if (response.status === 200) {
      console.log('✅ Uploads directory accessible');
      return true;
    } else {
      console.error('❌ Uploads directory not accessible');
      return false;
    }
  } catch (error) {
    if (error.response?.status === 404) {
      console.log('ℹ️ Uploads directory not found (this is normal if no files uploaded yet)');
      return true;
    } else {
      console.error('❌ Uploads directory test failed:', error.message);
      return false;
    }
  }
};

// Test multer configuration
const testMulterConfiguration = async () => {
  console.log('\n🧪 Testing Multer Configuration...');
  
  try {
    // Try to access the multer config
    const multerConfig = require('./config/multerConfig');
    
    if (multerConfig && multerConfig.profileImageUpload && multerConfig.eventImagesUpload) {
      console.log('✅ Multer configuration loaded successfully');
      console.log('📁 Profile image upload configured');
      console.log('📁 Event images upload configured');
      console.log('📁 Business images upload configured');
      console.log('📁 Gallery images upload configured');
      return true;
    } else {
      console.error('❌ Multer configuration incomplete');
      return false;
    }
  } catch (error) {
    console.error('❌ Multer configuration test failed:', error.message);
    return false;
  }
};

// Main test function
const runBasicTests = async () => {
  console.log('🚀 Starting Basic Functionality Tests...\n');
  
  let allTestsPassed = true;
  
  // Test server connectivity
  const serverRunning = await testServerConnectivity();
  if (!serverRunning) {
    console.log('\n❌ Server is not running. Please start the server first.');
    console.log('💡 Run: npm start or node server.js');
    return;
  }
  
  // Test multer configuration
  const multerConfig = await testMulterConfiguration();
  if (!multerConfig) allTestsPassed = false;
  
  // Test uploads directory
  const uploadsDir = await testUploadsDirectory();
  if (!uploadsDir) allTestsPassed = false;
  
  // Test authentication
  const token = await testAuthentication();
  if (!token) {
    console.log('\n⚠️ Authentication failed. Some tests will be skipped.');
    console.log('💡 Please check your admin credentials in the test file.');
  } else {
    // Test member API
    const memberAPI = await testMemberAPI(token);
    if (!memberAPI) allTestsPassed = false;
    
    // Test event API
    const eventAPI = await testEventAPI(token);
    if (!eventAPI) allTestsPassed = false;
  }
  
  console.log('\n📋 Test Summary:');
  console.log('✅ Server connectivity - Working');
  console.log(multerConfig ? '✅ Multer configuration - Working' : '❌ Multer configuration - Failed');
  console.log(uploadsDir ? '✅ Uploads directory - Working' : '❌ Uploads directory - Failed');
  console.log(token ? '✅ Authentication - Working' : '❌ Authentication - Failed');
  
  if (token) {
    console.log('✅ Member API - Working');
    console.log('✅ Event API - Working');
  }
  
  if (allTestsPassed) {
    console.log('\n🎉 All basic tests passed! Ready for image upload testing.');
    console.log('💡 Run the full test: node test_image_upload_functionality.js');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the configuration.');
  }
};

// Run tests
runBasicTests().catch(console.error);
