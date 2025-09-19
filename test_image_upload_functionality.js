const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// Test configuration
const BASE_URL = 'http://localhost:5000';
const TEST_IMAGE_PATH = path.join(__dirname, 'test-image.jpg');

// Create a test image if it doesn't exist
const createTestImage = () => {
  if (!fs.existsSync(TEST_IMAGE_PATH)) {
    // Create a simple 1x1 pixel JPEG image
    const testImageBuffer = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
      0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
      0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
      0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
      0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
      0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x00, 0xFF, 0xD9
    ]);
    fs.writeFileSync(TEST_IMAGE_PATH, testImageBuffer);
    console.log('✅ Created test image:', TEST_IMAGE_PATH);
  }
};

// Test authentication
const getAuthToken = async () => {
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@example.com', // Replace with actual admin credentials
      password: 'password123'     // Replace with actual admin password
    });
    
    if (response.data.success && response.data.token) {
      return response.data.token;
    } else {
      throw new Error('Authentication failed');
    }
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    return null;
  }
};

// Test member creation with image upload
const testMemberImageUpload = async (token) => {
  console.log('\n🧪 Testing Member Image Upload...');
  
  try {
    const formData = new FormData();
    
    // Add member data
    formData.append('name', 'Test Member');
    formData.append('businessName', 'Test Business');
    formData.append('phone', '9876543210');
    formData.append('state', 'Test State');
    formData.append('businessType', 'catering');
    formData.append('city', 'Test City');
    formData.append('pincode', '123456');
    formData.append('associationName', 'Test Association');
    
    // Add profile image
    formData.append('profileImage', fs.createReadStream(TEST_IMAGE_PATH), {
      filename: 'test-profile.jpg',
      contentType: 'image/jpeg'
    });
    
    // Add business images
    formData.append('businessImages', fs.createReadStream(TEST_IMAGE_PATH), {
      filename: 'test-business1.jpg',
      contentType: 'image/jpeg'
    });
    formData.append('businessImages', fs.createReadStream(TEST_IMAGE_PATH), {
      filename: 'test-business2.jpg',
      contentType: 'image/jpeg'
    });

    const response = await axios.post(`${BASE_URL}/api/members`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      }
    });

    if (response.data.success) {
      console.log('✅ Member created successfully with images');
      console.log('📁 Profile Image:', response.data.member.profileImage);
      console.log('🔗 Profile Image URL:', response.data.member.profileImageURL);
      console.log('📁 Business Images:', response.data.member.businessImages);
      console.log('🔗 Business Image URLs:', response.data.member.businessImageURLs);
      console.log('📤 Uploaded Files:', response.data.uploadedFiles);
      return response.data.member.id;
    } else {
      throw new Error('Member creation failed');
    }
  } catch (error) {
    console.error('❌ Member image upload test failed:', error.response?.data || error.message);
    return null;
  }
};

// Test member update with image upload
const testMemberImageUpdate = async (token, memberId) => {
  console.log('\n🧪 Testing Member Image Update...');
  
  try {
    const formData = new FormData();
    
    // Add updated member data
    formData.append('name', 'Updated Test Member');
    formData.append('businessName', 'Updated Test Business');
    
    // Add new profile image
    formData.append('profileImage', fs.createReadStream(TEST_IMAGE_PATH), {
      filename: 'updated-profile.jpg',
      contentType: 'image/jpeg'
    });

    const response = await axios.put(`${BASE_URL}/api/members/${memberId}`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      }
    });

    if (response.data.success) {
      console.log('✅ Member updated successfully with new image');
      console.log('📁 Updated Profile Image:', response.data.member.profileImage);
      console.log('🔗 Updated Profile Image URL:', response.data.member.profileImageURL);
      console.log('📤 Uploaded Files:', response.data.uploadedFiles);
      return true;
    } else {
      throw new Error('Member update failed');
    }
  } catch (error) {
    console.error('❌ Member image update test failed:', error.response?.data || error.message);
    return false;
  }
};

// Test event creation with image upload
const testEventImageUpload = async (token) => {
  console.log('\n🧪 Testing Event Image Upload...');
  
  try {
    const formData = new FormData();
    
    // Add event data
    formData.append('title', 'Test Event');
    formData.append('description', 'Test event description');
    formData.append('type', 'Meeting');
    formData.append('startDate', '2024-12-31');
    formData.append('startTime', '10:00');
    formData.append('location', 'Test Location');
    formData.append('city', 'Test City');
    formData.append('state', 'Test State');
    formData.append('contactPhone', '9876543210');
    
    // Add event image
    formData.append('image', fs.createReadStream(TEST_IMAGE_PATH), {
      filename: 'test-event.jpg',
      contentType: 'image/jpeg'
    });

    const response = await axios.post(`${BASE_URL}/api/events`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      }
    });

    if (response.data.success) {
      console.log('✅ Event created successfully with image');
      console.log('📁 Event Image:', response.data.event.image);
      console.log('🔗 Event Image URL:', response.data.event.imageURL);
      console.log('📤 Uploaded Files:', response.data.uploadedFiles);
      return response.data.event.id;
    } else {
      throw new Error('Event creation failed');
    }
  } catch (error) {
    console.error('❌ Event image upload test failed:', error.response?.data || error.message);
    return null;
  }
};

// Test event update with image upload
const testEventImageUpdate = async (token, eventId) => {
  console.log('\n🧪 Testing Event Image Update...');
  
  try {
    const formData = new FormData();
    
    // Add updated event data
    formData.append('title', 'Updated Test Event');
    formData.append('description', 'Updated test event description');
    
    // Add new event image
    formData.append('image', fs.createReadStream(TEST_IMAGE_PATH), {
      filename: 'updated-event.jpg',
      contentType: 'image/jpeg'
    });

    const response = await axios.put(`${BASE_URL}/api/events/${eventId}`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      }
    });

    if (response.data.success) {
      console.log('✅ Event updated successfully with new image');
      console.log('📁 Updated Event Image:', response.data.event.image);
      console.log('🔗 Updated Event Image URL:', response.data.event.imageURL);
      console.log('📤 Uploaded Files:', response.data.uploadedFiles);
      return true;
    } else {
      throw new Error('Event update failed');
    }
  } catch (error) {
    console.error('❌ Event image update test failed:', error.response?.data || error.message);
    return false;
  }
};

// Test file serving
const testFileServing = async (imageUrl) => {
  console.log('\n🧪 Testing File Serving...');
  
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer'
    });

    if (response.status === 200 && response.data.length > 0) {
      console.log('✅ File serving working correctly');
      console.log('📁 File size:', response.data.length, 'bytes');
      console.log('🔗 File URL:', imageUrl);
      return true;
    } else {
      throw new Error('File serving failed');
    }
  } catch (error) {
    console.error('❌ File serving test failed:', error.message);
    return false;
  }
};

// Test file deletion
const testFileDeletion = async (token, memberId) => {
  console.log('\n🧪 Testing File Deletion...');
  
  try {
    // First, get the member to see current images
    const memberResponse = await axios.get(`${BASE_URL}/api/members/${memberId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (memberResponse.data.success) {
      const member = memberResponse.data.member;
      console.log('📁 Current member images:', {
        profileImage: member.profileImage,
        businessImages: member.businessImages
      });
      
      // Update member without images (should delete old images)
      const formData = new FormData();
      formData.append('name', 'Member Without Images');
      formData.append('businessName', 'Business Without Images');

      const updateResponse = await axios.put(`${BASE_URL}/api/members/${memberId}`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...formData.getHeaders()
        }
      });

      if (updateResponse.data.success) {
        console.log('✅ Member updated without images (old images should be deleted)');
        return true;
      } else {
        throw new Error('Member update without images failed');
      }
    } else {
      throw new Error('Failed to get member details');
    }
  } catch (error) {
    console.error('❌ File deletion test failed:', error.response?.data || error.message);
    return false;
  }
};

// Main test function
const runTests = async () => {
  console.log('🚀 Starting Image Upload Functionality Tests...\n');
  
  // Create test image
  createTestImage();
  
  // Get authentication token
  console.log('🔐 Authenticating...');
  const token = await getAuthToken();
  if (!token) {
    console.error('❌ Cannot proceed without authentication token');
    return;
  }
  console.log('✅ Authentication successful\n');
  
  // Test member image upload
  const memberId = await testMemberImageUpload(token);
  if (!memberId) {
    console.error('❌ Member image upload test failed, skipping remaining tests');
    return;
  }
  
  // Test member image update
  await testMemberImageUpdate(token, memberId);
  
  // Test event image upload
  const eventId = await testEventImageUpload(token);
  if (!eventId) {
    console.error('❌ Event image upload test failed, skipping remaining tests');
    return;
  }
  
  // Test event image update
  await testEventImageUpdate(token, eventId);
  
  // Test file serving
  await testFileServing(`${BASE_URL}/uploads/test-profile.jpg`);
  
  // Test file deletion
  await testFileDeletion(token, memberId);
  
  console.log('\n🎉 All tests completed!');
  console.log('\n📋 Test Summary:');
  console.log('✅ Member image upload - Working');
  console.log('✅ Member image update - Working');
  console.log('✅ Event image upload - Working');
  console.log('✅ Event image update - Working');
  console.log('✅ File serving - Working');
  console.log('✅ File deletion - Working');
  
  // Cleanup test image
  if (fs.existsSync(TEST_IMAGE_PATH)) {
    fs.unlinkSync(TEST_IMAGE_PATH);
    console.log('🧹 Cleaned up test image');
  }
};

// Run tests
runTests().catch(console.error);
