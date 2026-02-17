const axios = require('axios');

async function testQRScannerAPI() {
    // Test with the cancelled registration IDs we updated
    const testCases = [
        { registrationId: 9106, memberId: 11060, eventId: 33, phone: '7248982000' },
        { registrationId: 8966, memberId: 10961, eventId: 33, phone: '8767040452' }
    ];

    const BASE_URL = 'https://mandapam-backend-97mi.onrender.com/api/events/checkin';

    for (const testCase of testCases) {
        console.log(`\n🔍 Testing QR Scanner API for: ${testCase.phone}`);
        console.log(`   Registration ID: ${testCase.registrationId}`);
        console.log(`   Member ID: ${testCase.memberId}`);
        console.log(`   Event ID: ${testCase.eventId}`);

        try {
            // Create a test QR token (you would normally get this from the actual QR code)
            const qrData = {
                r: testCase.registrationId,
                e: testCase.eventId,
                m: testCase.memberId
            };

            // For testing, we'll simulate the QR token format
            // In real scenario, this would be a signed JWT token
            console.log('\n📝 QR Data:', qrData);
            console.log('⚠️  Note: This is a simplified test. Real QR tokens are signed JWTs.');

            // Test the API endpoint (this will likely fail with invalid token format)
            const response = await axios.post(BASE_URL, {
                qrToken: 'EVT:test_token' // This will fail but shows the API structure
            }).catch(error => {
                if (error.response) {
                    return error.response;
                }
                throw error;
            });

            console.log('\n📋 API Response:', response.data);
            console.log('Status Code:', response.status);

        } catch (error) {
            console.log('\n❌ Error:', error.message);
            if (error.response) {
                console.log('Status:', error.response.status);
                console.log('Response:', error.response.data);
            }
        }

        console.log('\n' + '='.repeat(60));
    }

    console.log('\n💡 To test with real QR codes:');
    console.log('1. Generate actual QR tokens from the backend');
    console.log('2. Use those tokens in the API call');
    console.log('3. Check the response structure for cancelled registrations');
}

testQRScannerAPI();
