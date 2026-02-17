const { sequelize, Event, EventRegistration, Member } = require('./models');

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
      return [];
    }
    
    console.log('Found Kolhapur event:', kolhapurEvent.title, 'ID:', kolhapurEvent.id);
    
    // Get all registrations with member details
    const registrations = await EventRegistration.findAll({
      where: {
        eventId: kolhapurEvent.id
      },
      include: [{
        model: Member,
        as: 'member',
        attributes: ['id', 'name', 'phone', 'email']
      }]
    });
    
    const phoneNumbers = registrations.map(reg => ({
      registrationId: reg.id,
      memberId: reg.memberId,
      memberName: reg.member?.name || 'Unknown',
      mobileNumber: reg.member?.phone,
      email: reg.member?.email,
      status: reg.status,
      paymentStatus: reg.paymentStatus
    })).filter(reg => reg.mobileNumber); // Filter out entries without phone numbers
    
    console.log(`Found ${phoneNumbers.length} registered users with phone numbers`);
    
    await sequelize.close();
    return phoneNumbers;
    
  } catch (error) {
    console.error('Error:', error.message);
    return [];
  }
}

async function main() {
  const phoneNumbers = await getKolhapurEventRegistrations();
  console.log('All registration details:');
  console.log(JSON.stringify(phoneNumbers, null, 2));
}

main();
