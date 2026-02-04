const axios = require('axios');

async function testDeployedBackend() {
    // Using the QR token for registration 8989 (Sunil's cancelled registration)
    const qrToken = 'EVT:eyJkYXRhIjp7InIiOjg5ODksImUiOjMzLCJtIjoxOTQwLCJ0IjoxNzY1ODA4NTA5NjMxfSwic2lnIjoiMTE0ZTgzNzRlMDA1ZGEzMTA0NzJhZWRiNjU2YzRkN2EyNjk4MDBkM2M3YmRhM2Q3ZWYxMDAzZjk4YmRjMTI5MCJ9';

    const API_BASE_URL = 'https://mandapam-backend-97mi.onrender.com';

    console.log('🌐 Testing deployed backend at:', API_BASE_URL);
    console.log('🎫 QR Token:', qrToken);

    try {
        const response = await axios.post(`${API_BASE_URL}/api/events/checkin`, { qrToken });
        console.log('✅ Success Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        if (error.response) {
            console.log('❌ Error Response:');
            console.log('   Status:', error.response.status);
            console.log('   Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.log('❌ Network Error:', error.message);
        }
    }
}

testDeployedBackend();
