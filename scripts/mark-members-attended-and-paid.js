require('dotenv').config();
const { Event, EventRegistration, Member } = require('../models');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

async function markMembersAttendedAndPaid() {
  try {
    const eventId = 32;
    const startMemberId = 668;
    const endMemberId = 9184;
    const amountPaid = 1000;

    console.log('🚀 Starting Bulk Update...');
    console.log(`📅 Event ID: ${eventId}`);
    console.log(`👥 Members: ${startMemberId} to ${endMemberId}`);
    console.log(`💰 Amount Paid: ₹${amountPaid}\n`);

    // Find the event
    const event = await Event.findByPk(eventId);

    if (!event) {
      console.error(`❌ Event with ID ${eventId} not found!`);
      process.exit(1);
    }

    console.log(`✅ Event found:`);
    console.log(`   ID: ${event.id}`);
    console.log(`   Title: ${event.title}`);
    console.log(`   Current Attendees: ${event.currentAttendees || 0}\n`);

    // Find all registrations for this event in the member range
    const registrations = await EventRegistration.findAll({
      where: {
        eventId: eventId,
        memberId: {
          [Op.between]: [startMemberId, endMemberId]
        }
      },
      include: [{
        model: Member,
        as: 'member',
        attributes: ['id', 'name', 'phone']
      }],
      order: [['memberId', 'ASC']]
    });

    console.log(`✅ Found ${registrations.length} registrations to update\n`);

    if (registrations.length === 0) {
      console.log('⚠️  No registrations found in the specified range. Exiting...');
      process.exit(1);
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    const now = new Date();

    console.log('📝 Updating registrations...\n');

    // Process in batches
    const batchSize = 100;
    for (let i = 0; i < registrations.length; i += batchSize) {
      const batch = registrations.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(registrations.length / batchSize);

      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} registrations)...`);

      for (const registration of batch) {
        try {
          await registration.update({
            status: 'attended',
            paymentStatus: 'paid',
            amountPaid: amountPaid,
            attendedAt: now
          });
          successCount++;
        } catch (error) {
          errorCount++;
          errors.push({
            registrationId: registration.id,
            memberId: registration.memberId,
            memberName: registration.member?.name || 'Unknown',
            error: error.message
          });
          console.error(`  ❌ Error updating registration ${registration.id} (Member ${registration.memberId}): ${error.message}`);
        }
      }

      console.log(`  ✅ Batch ${batchNumber} completed\n`);
    }

    // Refresh event to get updated attendee count
    await event.reload();

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 BULK UPDATE SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Successfully updated: ${successCount} registrations`);
    console.log(`❌ Errors: ${errorCount} registrations`);
    console.log(`\n📈 Updated Details:`);
    console.log(`   Status: "attended"`);
    console.log(`   Payment Status: "paid"`);
    console.log(`   Amount Paid: ₹${amountPaid}`);
    console.log(`   Attended At: ${now.toISOString()}`);
    
    if (errorCount > 0) {
      console.log(`\n❌ Errors encountered (first 10):`);
      errors.slice(0, 10).forEach(err => {
        console.log(`   Registration ${err.registrationId} (Member ${err.memberId} - ${err.memberName}): ${err.error}`);
      });
      if (errors.length > 10) {
        console.log(`   ... and ${errors.length - 10} more errors`);
      }
    }

    console.log('\n✅ Bulk update completed!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
markMembersAttendedAndPaid();

