const { sequelize } = require('./config/database');
const Event = require('./models/Event');
const EventRegistration = require('./models/EventRegistration');

async function getKolhapurEventRegistrations() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');
    
    // Find Kolhapur event
    const kolhapurEvent = await Event.findOne({
      where: {
        city: 'Kolhapur'
      }
    });
    
    if (!kolhapurEvent) {
      console.log('No Kolhapur event found');
      return;
    }
    
    console.log('Found Kolhapur event:', kolhapurEvent.title, 'ID:', kolhapurEvent.id);
    
    // Count registrations for this event
    const registrationCount = await EventRegistration.count({
      where: {
        eventId: kolhapurEvent.id
      }
    });
    
    console.log('Total registrations for Kolhapur event:', registrationCount);
    
    await sequelize.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getKolhapurEventRegistrations();
