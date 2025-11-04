require('dotenv').config();
const { Event } = require('../models');

async function updateEventFee() {
  try {
    const eventId = 33;
    const newFee = 500;

    console.log(`Updating event ID ${eventId} registration fee to ₹${newFee}...`);

    // Find the event
    const event = await Event.findByPk(eventId);

    if (!event) {
      console.error(`❌ Event with ID ${eventId} not found`);
      process.exit(1);
    }

    console.log(`Current fee: ₹${event.registrationFee || 0}`);
    console.log(`Event: ${event.title}`);

    // Update the fee
    await event.update({
      registrationFee: newFee
    });

    console.log(`✅ Successfully updated event ID ${eventId}`);
    console.log(`   New registration fee: ₹${newFee}`);

    // Verify the update
    const updatedEvent = await Event.findByPk(eventId);
    console.log(`   Verified fee: ₹${updatedEvent.registrationFee}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating event fee:', error);
    process.exit(1);
  }
}

updateEventFee();

