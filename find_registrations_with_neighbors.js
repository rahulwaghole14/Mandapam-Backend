const { EventRegistration, Member } = require('./models');

async function findRegistrationsWithNeighbors() {
    const registrationIds = ['11059', '9105'];

    try {
        console.log('🔍 Searching for registrations and their neighbors...\n');

        for (const regId of registrationIds) {
            console.log(`\n📋 === Registration ID: ${regId} ===`);
            
            // Find the specific registration
            const registration = await EventRegistration.findByPk(regId);
            
            if (!registration) {
                console.log(`❌ Registration ${regId} not found`);
                continue;
            }

            const regData = registration.toJSON();
            console.log('\n📝 Registration Details:');
            console.log('   ID:', regData.id);
            console.log('   Member:', regData.memberName);
            console.log('   Phone:', regData.memberPhone);
            console.log('   Event ID:', regData.eventId);
            console.log('   Status:', regData.status);
            console.log('   Payment Status:', regData.paymentStatus);
            console.log('   Amount Paid:', regData.amountPaid);
            console.log('   Registered At:', regData.registeredAt);
            console.log('   Attended At:', regData.attendedAt || 'Not attended');
            console.log('   Cancelled At:', regData.cancelledAt || 'Not cancelled');

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
                console.log('   City:', memberData.city || 'N/A');
                console.log('   Association:', memberData.associationName || 'N/A');
                console.log('   Profile Image:', memberData.profileImage || 'N/A');
            }

            // Find previous registration
            const previousReg = await EventRegistration.findOne({
                where: {
                    id: { [require('sequelize').Op.lt]: parseInt(regId) }
                },
                order: [['id', 'DESC']],
                limit: 1
            });

            if (previousReg) {
                const prevData = previousReg.toJSON();
                console.log('\n⬅️  Previous Registration:');
                console.log('   ID:', prevData.id);
                console.log('   Member:', prevData.memberName);
                console.log('   Phone:', prevData.memberPhone);
                console.log('   Status:', prevData.status);
                console.log('   Payment Status:', prevData.paymentStatus);
                console.log('   Amount:', prevData.amountPaid);
            }

            // Find next registration
            const nextReg = await EventRegistration.findOne({
                where: {
                    id: { [require('sequelize').Op.gt]: parseInt(regId) }
                },
                order: [['id', 'ASC']],
                limit: 1
            });

            if (nextReg) {
                const nextData = nextReg.toJSON();
                console.log('\n➡️  Next Registration:');
                console.log('   ID:', nextData.id);
                console.log('   Member:', nextData.memberName);
                console.log('   Phone:', nextData.memberPhone);
                console.log('   Status:', nextData.status);
                console.log('   Payment Status:', nextData.paymentStatus);
                console.log('   Amount:', nextData.amountPaid);
            }

            console.log('\n' + '='.repeat(60));
        }

    } catch (error) {
        console.error('❌ Error finding registrations:', error);
    } finally {
        process.exit(0);
    }
}

findRegistrationsWithNeighbors();
