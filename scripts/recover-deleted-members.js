const { EventRegistration, Member, sequelize } = require('../models');
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');

async function recover() {
    try {
        const deletedIds = [293, 607, 751, 761, 792, 927, 1035, 1115, 1362, 1481, 1574, 2427, 2542, 2825, 2833, 3080, 3099, 3727, 3953, 4048, 4141, 4781, 4824, 4878, 5119, 5198, 5245, 5592, 6403, 6478, 6776, 7008, 7227, 7497, 7814, 9613, 9646, 9702, 9725, 10068, 10148, 10414, 9847, 7642, 10823, 8293, 5538, 11059, 322];

        console.log(`Starting recovery analysis for ${deletedIds.length} deleted IDs...`);

        const recoveryResults = [];

        // 1. Find all registrations where memberId is NULL but phone starts with 7387
        // These were orphaned when the members were deleted
        const orphanedRegs = await EventRegistration.findAll({
            where: {
                memberId: null,
                memberPhone: {
                    [Op.like]: '7387%'
                }
            }
        });

        console.log(`Found ${orphanedRegs.length} orphaned registrations.`);

        for (const reg of orphanedRegs) {
            recoveryResults.push({
                source: 'Registration Snapshot',
                name: reg.memberName,
                phone: reg.memberPhone,
                registrationId: reg.id
            });
        }

        // 2. Are there any other registrations that might provide clues?
        // Let's check for any duplicate phone numbers in registrations that are still active
        // but might belong to these IDs

        // 3. Construct CSV
        const csvRows = ['Source,Name,Phone,RegistrationID'];
        recoveryResults.forEach(res => {
            csvRows.push(`${res.source},"${res.name || ''}","${res.phone || ''}",${res.registrationId || ''}`);
        });

        const outputPath = '/home/mayur/Desktop/deleted_members_recovery.csv';
        fs.writeFileSync(outputPath, csvRows.join('\n'));

        console.log(`✅ Recovery data saved to: ${outputPath}`);
        console.log(`Total records found: ${recoveryResults.length}`);

    } catch (error) {
        console.error('Recovery failed:', error);
    } finally {
        process.exit();
    }
}

recover();
