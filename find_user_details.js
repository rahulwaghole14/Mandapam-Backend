const { Member, EventRegistration } = require('./models');

async function findUserDetails() {
    // Get command line arguments
    const args = process.argv.slice(2);
    const searchPhone = args[0] || null;
    const searchEmail = args[1] || null;
    const searchName = args[2] || null;

    if (!searchPhone && !searchEmail && !searchName) {
        console.log('❌ Please provide at least one search parameter:');
        console.log('   Usage: node find_user_details.js [phone] [email] [name]');
        console.log('   Example: node find_user_details.js 7248982000');
        console.log('   Example: node find_user_details.js 7248982000 test@example.com "John Doe"');
        process.exit(1);
    }

    try {
        console.log('🔍 Searching for user details...');

        // Search by phone
        if (searchPhone) {
            console.log(`\n--- Searching by phone: ${searchPhone} ---`);
            const memberByPhone = await Member.findOne({ where: { phone: searchPhone } });
            console.log('Member by phone:', memberByPhone ? JSON.stringify(memberByPhone.toJSON(), null, 2) : 'Not found');

            const registrationsByPhone = await EventRegistration.findAll({ where: { memberPhone: searchPhone } });
            console.log('Registrations by phone:', registrationsByPhone.length ? JSON.stringify(registrationsByPhone.map(r => r.toJSON()), null, 2) : 'Not found');
        }

        // Search by email
        if (searchEmail) {
            console.log(`\n--- Searching by email: ${searchEmail} ---`);
            const memberByEmail = await Member.findOne({ where: { email: searchEmail } });
            console.log('Member by email:', memberByEmail ? JSON.stringify(memberByEmail.toJSON(), null, 2) : 'Not found');

            if (memberByEmail) {
                const registrationsByMemberId = await EventRegistration.findAll({ where: { memberId: memberByEmail.id } });
                console.log('Registrations by Member Email (via ID):', registrationsByMemberId.length ? JSON.stringify(registrationsByMemberId.map(r => r.toJSON()), null, 2) : 'Not found');
            }
        }

        // Search by name (partial)
        if (searchName) {
            console.log(`\n--- Searching by name (partial): ${searchName} ---`);
            const { Op } = require('sequelize');
            const membersByName = await Member.findAll({
                where: {
                    name: { [Op.iLike]: `%${searchName}%` }
                }
            });
            console.log('Members by name:', membersByName.length ? JSON.stringify(membersByName.map(m => m.toJSON()), null, 2) : 'Not found');

            const registrationsByName = await EventRegistration.findAll({
                where: {
                    memberName: { [Op.iLike]: `%${searchName}%` }
                }
            });
            console.log('Registrations by name:', registrationsByName.length ? JSON.stringify(registrationsByName.map(r => r.toJSON()), null, 2) : 'Not found');
        }

    } catch (error) {
        console.error('❌ Error finding user details:', error);
    } finally {
        process.exit(0);
    }
}

findUserDetails();
