const { EventRegistration } = require('./models');
const qrService = require('./services/qrService');
const axios = require('axios');

async function testQrCheckin() {
    const mockRegistration = {
        id: 8989,
        eventId: 33,
        memberId: 1940,
        registeredAt: new Date(),
    };
    const registrationId = mockRegistration.id;
    const eventId = mockRegistration.eventId;
    const memberId = mockRegistration.memberId;

    try {
        console.log(`🔍 Testing QR check-in for registration ID: ${registrationId}...`);

        // Fetch registration from DB to get actual data
        const registration = await EventRegistration.findByPk(registrationId);
        if (!registration) {
            console.error('❌ Registration not found in DB!');
            return;
        }

        console.log('📝 Current Registration Status:', registration.status);
        console.log('📝 Current Payment Status:', registration.paymentStatus);

        // Generate QR token manually using the same logic as the backend
        const payload = qrService.buildPayload(registration);
        const tokenObj = qrService.signPayload(payload);
        const tokenString = Buffer.from(JSON.stringify(tokenObj)).toString('base64url');
        const qrToken = `EVT:${tokenString}`;

        console.log('🎫 Generated QR Token:', qrToken);

        // Call the check-in API
        // Note: Assuming the server is running on localhost:5000 as per common setup in this project
        const port = process.env.PORT || 5000;
        const url = `http://localhost:${port}/api/events/checkin`;

        console.log(`🌐 Calling API: ${url}...`);

        try {
            const response = await axios.post(url, { qrToken });
            console.log('✅ API Response (Success - Unexpected!):', response.data);
        } catch (error) {
            if (error.response) {
                console.log('✅ API Response (Expected Error):', {
                    status: error.response.status,
                    data: error.response.data
                });

                if (error.response.status === 400 && error.response.data.message === 'Registration cancelled') {
                    console.log('🏆 Test PASSED: API correctly rejected cancelled registration.');
                } else {
                    console.log('❌ Test FAILED: Unexpected error response.');
                }
            } else {
                console.error('❌ API call failed:', error.message);
            }
        }

    } catch (error) {
        console.error('❌ Error in test script:', error);
    } finally {
        process.exit(0);
    }
}

testQrCheckin();
