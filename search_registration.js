const { EventRegistration, Member } = require('./models');

async function searchRegistrationById() {
    // Get command line arguments
    const args = process.argv.slice(2);
    const registrationId = args[0];

    if (!registrationId) {
        console.log('❌ Please provide a registration ID:');
        console.log('   Usage: node search_registration.js <registration_id>');
        console.log('   Example: node search_registration.js 9106');
        process.exit(1);
    }

    try {
        console.log(`🔍 Searching for registration ID: ${registrationId}...`);
        
        // Find the registration
        const registration = await EventRegistration.findByPk(registrationId);
        
        if (!registration) {
            console.error('❌ Registration not found with ID:', registrationId);
            process.exit(1);
        }

        const regData = registration.toJSON();
        console.log('\n📋 Registration Details:');
        console.log('   ID:', regData.id);
        console.log('   Event ID:', regData.eventId);
        console.log('   Member ID:', regData.memberId);
        console.log('   Member Name:', regData.memberName);
        console.log('   Member Phone:', regData.memberPhone);
        console.log('   Status:', regData.status);
        console.log('   Payment Status:', regData.paymentStatus);
        console.log('   Amount Paid:', regData.amountPaid);
        console.log('   Payment Order ID:', regData.paymentOrderId || 'N/A');
        console.log('   Payment ID:', regData.paymentId || 'N/A');
        console.log('   Registered At:', regData.registeredAt);
        console.log('   Attended At:', regData.attendedAt || 'Not attended');
        console.log('   Cancelled At:', regData.cancelledAt || 'Not cancelled');
        console.log('   Notes:', regData.notes || 'N/A');
        console.log('   PDF Path:', regData.pdfPath || 'N/A');
        console.log('   PDF Sent At:', regData.pdfSentAt || 'Not sent');

        // Find member details
        const member = await Member.findByPk(regData.memberId);
        if (member) {
            const memberData = member.toJSON();
            console.log('\n👤 Member Details:');
            console.log('   Member ID:', memberData.id);
            console.log('   Name:', memberData.name);
            console.log('   Business Name:', memberData.businessName || 'N/A');
            console.log('   Business Type:', memberData.businessType || 'N/A');
            console.log('   Email:', memberData.email || 'N/A');
            console.log('   Phone:', memberData.phone);
            console.log('   Address:', memberData.address || 'N/A');
            console.log('   City:', memberData.city || 'N/A');
            console.log('   State:', memberData.state || 'N/A');
            console.log('   Pincode:', memberData.pincode || 'N/A');
            console.log('   Association:', memberData.associationName || 'N/A');
            console.log('   Is Active:', memberData.isActive ? 'Yes' : 'No');
            console.log('   Is Verified:', memberData.isVerified ? 'Yes' : 'No');
            console.log('   Rating:', memberData.rating);
            console.log('   Total Bookings:', memberData.totalBookings);
            console.log('   Profile Image:', memberData.profileImage || 'N/A');
        }

    } catch (error) {
        console.error('❌ Error searching registration:', error);
    } finally {
        process.exit(0);
    }
}

searchRegistrationById();
