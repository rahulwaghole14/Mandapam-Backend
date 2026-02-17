const qrService = require('./services/qrService');
const { EventRegistration } = require('./models');
const axios = require('axios');

async function testQRScannerAPI() {
    // Test with the cancelled registration IDs we updated
    const testCases = [
        { registrationId: 9106, phone: '7248982000' },
        { registrationId: 8966, phone: '8767040452' }
    ];

    const BASE_URL = 'https://mandapam-backend-97mi.onrender.com/api/events/checkin';

    for (const testCase of testCases) {
        console.log(`\n🔍 Testing QR Scanner API for: ${testCase.phone}`);
        console.log(`   Registration ID: ${testCase.registrationId}`);

        try {
            // Get the registration from database
            const registration = await EventRegistration.findByPk(testCase.registrationId);
            
            if (!registration) {
                console.log('❌ Registration not found in database');
                continue;
            }

            console.log('📋 Registration Status:', registration.status);
            console.log('💰 Payment Status:', registration.paymentStatus);
            console.log('🚫 Cancelled At:', registration.cancelledAt || 'Not cancelled');

            // Generate a valid QR token
            const qrDataURL = await qrService.generateQrDataURL(registration);
            console.log('🎫 QR Token generated successfully');

            // Extract the actual token from the QR service generation
            // The QR service creates the token internally, so we need to replicate that exactly
            const payload = qrService.buildPayload(registration);
            const tokenObj = qrService.signPayload(payload);
            
            // Use the exact same base64url method as the QR service
            const jsonString = JSON.stringify(tokenObj);
            const base64 = Buffer.from(jsonString).toString('base64');
            const tokenString = base64
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=/g, '');
            
            const qrToken = `EVT:${tokenString}`;
            
            console.log('🔑 EVT Token:', qrToken.substring(0, 50) + '...');

            // Test the API endpoint with the real token
            console.log('\n🚀 Testing API call...');
            const response = await axios.post(BASE_URL, {
                qrToken: qrToken
            }).catch(error => {
                if (error.response) {
                    return error.response;
                }
                throw error;
            });

            console.log('\n📋 API Response:');
            console.log('Status Code:', response.status);
            console.log('Success:', response.data.success);
            console.log('Message:', response.data.message);
            
            if (response.data.status) {
                console.log('Registration Status:', response.data.status);
            }
            if (response.data.paymentStatus) {
                console.log('Payment Status:', response.data.paymentStatus);
            }
            if (response.data.cancelledAt) {
                console.log('Cancelled At:', response.data.cancelledAt);
            }
            if (response.data.member) {
                console.log('Member Name:', response.data.member.name);
                console.log('Profile Image:', response.data.member.profileImageURL ? 'Available' : 'Not available');
            }

        } catch (error) {
            console.log('\n❌ Error:', error.message);
            if (error.response) {
                console.log('Status:', error.response.status);
                console.log('Response:', error.response.data);
            }
        }

        console.log('\n' + '='.repeat(60));
    }
}

testQRScannerAPI();
