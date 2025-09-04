const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:5000';

// Admin user data
const adminData = {
  name: 'Admin User',
  email: 'admin@mandap.com',
  password: 'admin123',
  district: 'Mumbai',
  state: 'Maharashtra',
  phone: '9876543210'
};

async function createAdminUser() {
  try {
    console.log('🚀 Creating initial admin user...');
    console.log('📧 Email:', adminData.email);
    console.log('🔑 Password:', adminData.password);
    console.log('📍 District:', adminData.district);
    console.log('🏛️ State:', adminData.state);
    console.log('📱 Phone:', adminData.phone);
    console.log('');

    const response = await axios.post(`${API_BASE_URL}/api/auth/init-admin`, adminData);
    
    if (response.data.success) {
      console.log('✅ Admin user created successfully!');
      console.log('👤 User ID:', response.data.user._id);
      console.log('🎫 JWT Token:', response.data.token);
      console.log('');
      console.log('🔗 You can now login with:');
      console.log('   Email: admin@mandap.com');
      console.log('   Password: admin123');
      console.log('');
      console.log('📝 Save this token for API testing:');
      console.log(response.data.token);
    }
  } catch (error) {
    if (error.response) {
      console.error('❌ Error creating admin user:');
      console.error('Status:', error.response.status);
      console.error('Message:', error.response.data.message);
      
      if (error.response.status === 400 && error.response.data.message.includes('already exists')) {
        console.log('');
        console.log('ℹ️ Admin user already exists. You can login with:');
        console.log('   Email: admin@mandap.com');
        console.log('   Password: admin123');
      }
    } else {
      console.error('❌ Network error:', error.message);
      console.log('');
      console.log('💡 Make sure your backend server is running on http://localhost:5000');
    }
  }
}

// Run the script
createAdminUser();





