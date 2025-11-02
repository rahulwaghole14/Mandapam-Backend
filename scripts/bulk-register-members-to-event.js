require('dotenv').config();
const { Event, EventRegistration, Member } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

async function bulkRegisterMembers() {
  try {
    const eventId = 32;
    const startMemberId = 668;
    const endMemberId = 9184;

    console.log('🚀 Starting Bulk Registration...');
    console.log(`📅 Event ID: ${eventId}`);
    console.log(`👥 Members: ${startMemberId} to ${endMemberId}`);
    console.log(`📊 Total: ${endMemberId - startMemberId + 1} members\n`);

    // Find the event by ID
    const event = await Event.findByPk(eventId);

    if (!event) {
      console.error(`❌ Event with ID ${eventId} not found!`);
      process.exit(1);
    }

    console.log(`✅ Event found:`);
    console.log(`   ID: ${event.id}`);
    console.log(`   Title: ${event.title}`);
    console.log(`   Start Date: ${event.startDate}`);
    console.log(`   Current Attendees: ${event.currentAttendees || 0}`);
    console.log(`   Max Attendees: ${event.maxAttendees || 'Unlimited'}\n`);

    // Verify member range exists
    const memberCount = await Member.count({
      where: {
        id: {
          [Op.between]: [startMemberId, endMemberId]
        }
      }
    });

    console.log(`✅ Found ${memberCount} members in range ${startMemberId}-${endMemberId}\n`);

    if (memberCount === 0) {
      console.log('⚠️  No members found in the specified range. Exiting...');
      process.exit(1);
    }

    // Check existing registrations
    const existingRegistrations = await EventRegistration.findAll({
      where: {
        eventId: event.id,
        memberId: {
          [Op.between]: [startMemberId, endMemberId]
        },
        status: 'registered'
      },
      attributes: ['memberId']
    });

    const existingMemberIds = new Set(existingRegistrations.map(r => r.memberId));
    console.log(`ℹ️  ${existingMemberIds.size} members already registered (will be skipped)\n`);

    // Get all members in range
    const members = await Member.findAll({
      where: {
        id: {
          [Op.between]: [startMemberId, endMemberId]
        }
      },
      attributes: ['id', 'name', 'phone'],
      order: [['id', 'ASC']]
    });

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    const errors = [];

    console.log('📝 Registering members...\n');

    // Process in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < members.length; i += batchSize) {
      const batch = members.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(members.length / batchSize);

      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} members)...`);

      for (const member of batch) {
        try {
          // Skip if already registered
          if (existingMemberIds.has(member.id)) {
            skipCount++;
            continue;
          }

          // Check if there's a cancelled registration to reactivate
          const existingRegistration = await EventRegistration.findOne({
            where: {
              eventId: event.id,
              memberId: member.id,
              status: 'cancelled'
            }
          });

          if (existingRegistration) {
            // Reactivate cancelled registration
            await existingRegistration.update({
              status: 'registered',
              registeredAt: new Date(),
              paymentStatus: 'pending'
            });
            successCount++;
          } else {
            // Create new registration
            await EventRegistration.create({
              eventId: event.id,
              memberId: member.id,
              status: 'registered',
              paymentStatus: 'pending',
              registeredAt: new Date()
            });
            successCount++;
          }

        } catch (error) {
          errorCount++;
          errors.push({
            memberId: member.id,
            memberName: member.name,
            error: error.message
          });
          console.error(`  ❌ Error registering member ${member.id} (${member.name}): ${error.message}`);
        }
      }

      console.log(`  ✅ Batch ${batchNumber} completed\n`);
    }

    // Update attendee count once with total new registrations
    if (successCount > 0) {
      await Event.increment('currentAttendees', {
        where: { id: event.id },
        by: successCount
      });
    }

    // Refresh event to get updated attendee count
    await event.reload();

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 BULK REGISTRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully registered: ${successCount} members`);
    console.log(`⏭️  Already registered (skipped): ${skipCount} members`);
    console.log(`❌ Errors: ${errorCount} members`);
    console.log(`\n📈 Event Stats:`);
    console.log(`   Current Attendees: ${event.currentAttendees}`);
    console.log(`   Max Attendees: ${event.maxAttendees || 'Unlimited'}`);
    
    if (errorCount > 0) {
      console.log(`\n❌ Errors encountered (first 10):`);
      errors.slice(0, 10).forEach(err => {
        console.log(`   Member ${err.memberId} (${err.memberName}): ${err.error}`);
      });
      if (errors.length > 10) {
        console.log(`   ... and ${errors.length - 10} more errors`);
      }
    }

    console.log('\n✅ Bulk registration completed!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
bulkRegisterMembers();

