const axios = require('axios');

// Test Association BOD Creation
async function testAssociationBOD() {
  try {
    const bodData = {
      name: "Test Association BOD Member",
      designation: "President",
      contactNumber: "9876543210",
      email: "association.bod@test.com",
      bio: "Test Association BOD member bio",
      address: "Test Association address, Mumbai",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      isActive: true,
      associationId: 7
    };

    console.log('Testing Association BOD Creation...');
    console.log('Request data:', JSON.stringify(bodData, null, 2));

    const response = await axios.post('http://localhost:5000/api/bod', bodData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBtYW5kYXAuY29tIiwibmFtZSI6IkFkbWluIFVzZXIiLCJyb2xlIjoiYWRtaW4iLCJkaXN0cmljdCI6IkRlZmF1bHQgRGlzdHJpY3QiLCJzdGF0ZSI6IkRlZmF1bHQgU3RhdGUiLCJwaG9uZSI6IjEyMzQ1Njc4OTAiLCJpc0FjdGl2ZSI6dHJ1ZSwiaWF0IjoxNzU3MzQwODMzLCJleHAiOjE3NTc0MjcyMzN9.yYm_zMPVvgRzHiAXOQBnqVhUz3jWm8tI6qtX8HaTrek'
      }
    });

    console.log('✅ Association BOD Created Successfully!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return response.data.bod.id;

  } catch (error) {
    console.error('❌ Association BOD Creation Failed!');
    console.error('Error:', error.response?.data || error.message);
    return null;
  }
}

// Test National BOD Creation
async function testNationalBOD() {
  try {
    const bodData = {
      name: "Test National BOD Member",
      designation: "President",
      contactNumber: "9876543211",
      email: "national.bod@test.com",
      bio: "Test National BOD member bio",
      address: "Test National address, Mumbai",
      city: "Mumbai",
      state: "Maharashtra",
      pincode: "400001",
      isActive: true
      // No associationId - should be null
    };

    console.log('\nTesting National BOD Creation...');
    console.log('Request data:', JSON.stringify(bodData, null, 2));

    const response = await axios.post('http://localhost:5000/api/bod', bodData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBtYW5kYXAuY29tIiwibmFtZSI6IkFkbWluIFVzZXIiLCJyb2xlIjoiYWRtaW4iLCJkaXN0cmljdCI6IkRlZmF1bHQgRGlzdHJpY3QiLCJzdGF0ZSI6IkRlZmF1bHQgU3RhdGUiLCJwaG9uZSI6IjEyMzQ1Njc4OTAiLCJpc0FjdGl2ZSI6dHJ1ZSwiaWF0IjoxNzU3MzQwODMzLCJleHAiOjE3NTc0MjcyMzN9.yYm_zMPVvgRzHiAXOQBnqVhUz3jWm8tI6qtX8HaTrek'
      }
    });

    console.log('✅ National BOD Created Successfully!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    return response.data.bod.id;

  } catch (error) {
    console.error('❌ National BOD Creation Failed!');
    console.error('Error:', error.response?.data || error.message);
    return null;
  }
}

// Test BOD Retrieval
async function testBODRetrieval() {
  try {
    console.log('\nTesting BOD Retrieval...');
    
    // Test get all BODs
    const allBODs = await axios.get('http://localhost:5000/api/bod', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBtYW5kYXAuY29tIiwibmFtZSI6IkFkbWluIFVzZXIiLCJyb2xlIjoiYWRtaW4iLCJkaXN0cmljdCI6IkRlZmF1bHQgRGlzdHJpY3QiLCJzdGF0ZSI6IkRlZmF1bHQgU3RhdGUiLCJwaG9uZSI6IjEyMzQ1Njc4OTAiLCJpc0FjdGl2ZSI6dHJ1ZSwiaWF0IjoxNzU3MzQwODMzLCJleHAiOjE3NTc0MjcyMzN9.yYm_zMPVvgRzHiAXOQBnqVhUz3jWm8tI6qtX8HaTrek'
      }
    });

    console.log('✅ All BODs Retrieved Successfully!');
    console.log('Total BODs:', allBODs.data.total);
    console.log('BODs:', allBODs.data.bods.map(bod => ({
      id: bod.id,
      name: bod.name,
      designation: bod.designation,
      associationId: bod.associationId
    })));

    // Test get Association BODs only
    const associationBODs = await axios.get('http://localhost:5000/api/bod?type=association', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBtYW5kYXAuY29tIiwibmFtZSI6IkFkbWluIFVzZXIiLCJyb2xlIjoiYWRtaW4iLCJkaXN0cmljdCI6IkRlZmF1bHQgRGlzdHJpY3QiLCJzdGF0ZSI6IkRlZmF1bHQgU3RhdGUiLCJwaG9uZSI6IjEyMzQ1Njc4OTAiLCJpc0FjdGl2ZSI6dHJ1ZSwiaWF0IjoxNzU3MzQwODMzLCJleHAiOjE3NTc0MjcyMzN9.yYm_zMPVvgRzHiAXOQBnqVhUz3jWm8tI6qtX8HaTrek'
      }
    });

    console.log('✅ Association BODs Retrieved Successfully!');
    console.log('Association BODs count:', associationBODs.data.total);

    // Test get National BODs only
    const nationalBODs = await axios.get('http://localhost:5000/api/bod?type=national', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBtYW5kYXAuY29tIiwibmFtZSI6IkFkbWluIFVzZXIiLCJyb2xlIjoiYWRtaW4iLCJkaXN0cmljdCI6IkRlZmF1bHQgRGlzdHJpY3QiLCJzdGF0ZSI6IkRlZmF1bHQgU3RhdGUiLCJwaG9uZSI6IjEyMzQ1Njc4OTAiLCJpc0FjdGl2ZSI6dHJ1ZSwiaWF0IjoxNzU3MzQwODMzLCJleHAiOjE3NTc0MjcyMzN9.yYm_zMPVvgRzHiAXOQBnqVhUz3jWm8tI6qtX8HaTrek'
      }
    });

    console.log('✅ National BODs Retrieved Successfully!');
    console.log('National BODs count:', nationalBODs.data.total);

  } catch (error) {
    console.error('❌ BOD Retrieval Failed!');
    console.error('Error:', error.response?.data || error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('🧪 Starting BOD API Tests...\n');
  
  const associationBODId = await testAssociationBOD();
  const nationalBODId = await testNationalBOD();
  
  await testBODRetrieval();
  
  console.log('\n🎉 BOD API Tests Completed!');
  console.log('Association BOD ID:', associationBODId);
  console.log('National BOD ID:', nationalBODId);
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testAssociationBOD, testNationalBOD, testBODRetrieval };
