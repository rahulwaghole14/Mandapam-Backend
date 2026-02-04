const { EventRegistration } = require('./models');
const readline = require('readline');

async function updateRegistration() {
    // Get command line arguments
    const args = process.argv.slice(2);
    const registrationId = args[0];

    if (!registrationId) {
        console.log('❌ Please provide a registration ID:');
        console.log('   Usage: node update_registration.js <registration_id>');
        console.log('   Example: node update_registration.js 9106');
        process.exit(1);
    }

    // First, find the registration to show current details
    try {
        console.log(`🔍 Finding registration ID: ${registrationId}...`);
        
        const registration = await EventRegistration.findByPk(registrationId);
        
        if (!registration) {
            console.error('❌ Registration not found with ID:', registrationId);
            process.exit(1);
        }

        const regData = registration.toJSON();
        console.log('\n📋 Current Registration Details:');
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

        // Ask for confirmation
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const question = `\n⚠️  Are you sure you want to update this registration to CANCELLED and REFUNDED? (yes/no): `;
        
        const answer = await new Promise((resolve) => {
            rl.question(question, (input) => {
                rl.close();
                resolve(input.trim().toLowerCase());
            });
        });

        if (answer !== 'yes' && answer !== 'y') {
            console.log('❌ Update cancelled by user.');
            process.exit(0);
        }

        console.log(`\n🚀 Updating registration ID: ${registrationId}...`);

        const [updatedCount] = await EventRegistration.update(
            {
                status: 'cancelled',
                paymentStatus: 'refunded',
                cancelledAt: new Date()
            },
            {
                where: { id: registrationId }
            }
        );

        if (updatedCount > 0) {
            console.log('✅ Registration updated successfully.');

            // Fetch updated record to verify
            const updatedRecord = await EventRegistration.findByPk(registrationId);
            console.log('📝 Updated Record:', JSON.stringify(updatedRecord.toJSON(), null, 2));
        } else {
            console.error('❌ Registration not found or no changes made.');
        }

    } catch (error) {
        console.error('❌ Error updating registration:', error);
    } finally {
        process.exit(0);
    }
}

updateRegistration();
