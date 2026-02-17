const qrService = require('./services/qrService');
const { EventRegistration } = require('./models');

async function testQRTokenGeneration() {
    try {
        // Get a cancelled registration
        const registration = await EventRegistration.findByPk(9106);
        
        if (!registration) {
            console.log('❌ Registration not found');
            return;
        }

        console.log('📋 Registration Details:');
        console.log('ID:', registration.id);
        console.log('Status:', registration.status);
        console.log('Payment Status:', registration.paymentStatus);

        // Generate QR token using the service
        const qrDataURL = await qrService.generateQrDataURL(registration);
        console.log('\n🎫 QR Data URL (first 100 chars):', qrDataURL.substring(0, 100) + '...');

        // Extract the token part
        const qrText = qrDataURL.split(',')[1]; // Remove data:image/png;base64, prefix
        console.log('\n📷 QR Image Data (first 100 chars):', qrText.substring(0, 100) + '...');

        // Let's also manually create the token to see the format
        const payload = qrService.buildPayload(registration);
        console.log('\n📦 Payload:', JSON.stringify(payload, null, 2));

        const tokenObj = qrService.signPayload(payload);
        console.log('\n🔐 Token Object:', JSON.stringify(tokenObj, null, 2));

        // Try different base64url approaches
        const jsonString = JSON.stringify(tokenObj);
        const base64 = Buffer.from(jsonString).toString('base64');
        
        // Method 1: Manual replacement
        let tokenString1 = base64
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
        
        // Method 2: Using toString('base64url') if available
        let tokenString2;
        try {
            tokenString2 = Buffer.from(jsonString).toString('base64url');
        } catch (e) {
            tokenString2 = 'base64url not supported';
        }

        console.log('\n🔑 Token Method 1 (manual):', `EVT:${tokenString1.substring(0, 50)}...`);
        console.log('🔑 Token Method 2 (base64url):', `EVT:${tokenString2.substring(0, 50)}...`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testQRTokenGeneration();
