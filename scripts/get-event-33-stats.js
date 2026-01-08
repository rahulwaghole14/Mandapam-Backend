const { EventRegistration, Event: EventModel, sequelize } = require('../models');

async function getStats() {
    try {
        const eventId = 33;
        const event = await EventModel.findByPk(eventId);
        if (!event) {
            console.log('Event 33 not found');
            process.exit(0);
        }
        const total = await EventRegistration.count({ where: { eventId } });
        const orphaned = await EventRegistration.count({ where: { eventId, memberId: null } });

        console.log(`Registration Stats for Event 33 (${event.title}):`);
        console.log(`- Total Registrations: ${total}`);
        console.log(`- Orphaned (Member Deleted): ${orphaned}`);
    } catch (error) {
        console.error('Error fetching stats:', error);
    } finally {
        process.exit();
    }
}

getStats();
