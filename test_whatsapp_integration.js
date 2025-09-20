const axios = require('axios');

async function testWhatsAppIntegration() {
  const baseUrl = 'https://mandapam-backend-97mi.onrender.com';
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBtYW5kYXAuY29tIiwibmFtZSI6IkFkbWluIFVzZXIiLCJyb2xlIjoiYWRtaW4iLCJkaXN0cmljdCI6IkRlZmF1bHQgRGlzdHJpY3QiLCJzdGF0ZSI6IkRlZmF1bHQgU3RhdGUiLCJwaG9uZSI6IjEyMzQ1Njc4OTAiLCJpc0FjdGl2ZSI6dHJ1ZSwiaWF0IjoxNzU4MzM1MjU2LCJleHAiOjE3NTg0MjE2NTZ9.Vq5qN7fYHU7AcodwDzZ9qBgXE52-5f9BxisNka4lDQc';
  
  console.log('📱 Testing WhatsApp Integration...\n');
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    // Step 1: Check WhatsApp service status
    console.log('1️⃣ Checking WhatsApp service status...');
    const statusResponse = await axios.get(`${baseUrl}/api/whatsapp/status`, { headers });
    console.log('✅ WhatsApp status:', statusResponse.data);
    console.log('');

    // Step 2: Test WhatsApp configuration (if not configured)
    if (!statusResponse.data.status.isEnabled) {
      console.log('2️⃣ WhatsApp not configured. Testing configuration...');
      
      // Test with dummy credentials
      const testConfig = {
        instanceId: 'TEST_INSTANCE_123',
        accessToken: 'TEST_TOKEN_456'
      };
      
      try {
        const configResponse = await axios.post(`${baseUrl}/api/whatsapp/config`, testConfig, { headers });
        console.log('✅ Configuration test:', configResponse.data);
      } catch (error) {
        console.log('⚠️ Configuration test failed:', error.response?.data || error.message);
      }
      console.log('');
    }

    // Step 3: Test mobile OTP with WhatsApp integration
    console.log('3️⃣ Testing mobile OTP with WhatsApp integration...');
    const phoneNumber = '9876543210';
    
    const otpResponse = await axios.post(`${baseUrl}/api/mobile/send-otp`, {
      mobileNumber: phoneNumber
    });
    
    console.log('✅ OTP response:', otpResponse.data);
    console.log('');

    // Step 4: Test WhatsApp configuration endpoints
    console.log('4️⃣ Testing WhatsApp configuration endpoints...');
    
    // Get current config
    try {
      const configResponse = await axios.get(`${baseUrl}/api/whatsapp/config`, { headers });
      console.log('✅ Current config:', configResponse.data);
    } catch (error) {
      console.log('⚠️ No config found:', error.response?.data || error.message);
    }
    
    // Test configuration
    try {
      const testResponse = await axios.post(`${baseUrl}/api/whatsapp/test`, {
        testPhoneNumber: '9876543210'
      }, { headers });
      console.log('✅ Test result:', testResponse.data);
    } catch (error) {
      console.log('⚠️ Test failed:', error.response?.data || error.message);
    }
    console.log('');

    // Step 5: Test OTP verification
    console.log('5️⃣ Testing OTP verification...');
    const verifyResponse = await axios.post(`${baseUrl}/api/mobile/verify-otp`, {
      mobileNumber: phoneNumber,
      otp: '123456'
    });
    
    console.log('✅ OTP verification:', verifyResponse.data);
    console.log('');

    console.log('🎉 WhatsApp integration test completed!');
    console.log('');
    console.log('📋 Summary:');
    console.log('- WhatsApp service status checked');
    console.log('- Mobile OTP flow tested');
    console.log('- Configuration endpoints tested');
    console.log('- OTP verification tested');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

// Run the test
testWhatsAppIntegration();
