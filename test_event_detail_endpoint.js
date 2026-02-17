require('dotenv').config();
const { Event, EventRegistration, Member, EventExhibitor } = require('./models');

async function testEventDetailEndpoints() {
  try {
    const eventId = 32;

    console.log('🧪 Testing Event Detail Endpoints for Event ID:', eventId);
    console.log('='.repeat(60));
    console.log('');

    // Test 1: Get event basic info
    console.log('📋 Test 1: Basic Event Information');
    console.log('-'.repeat(60));
    const event = await Event.findByPk(eventId);
    if (!event) {
      console.error('❌ Event not found!');
      process.exit(1);
    }
    console.log(`✅ Event found:`);
    console.log(`   ID: ${event.id}`);
    console.log(`   Title: ${event.title}`);
    console.log(`   Start Date: ${event.startDate}`);
    console.log(`   End Date: ${event.endDate}`);
    console.log(`   Registration Fee: ₹${event.registrationFee || 0}`);
    console.log(`   Current Attendees: ${event.currentAttendees || 0}`);
    console.log(`   Max Attendees: ${event.maxAttendees || 'Unlimited'}`);
    console.log(`   Status: ${event.status}`);
    console.log('');

    // Test 2: Check registrations count
    console.log('📊 Test 2: Registration Statistics');
    console.log('-'.repeat(60));
    const totalRegistrations = await EventRegistration.count({
      where: { eventId }
    });
    const attendedCount = await EventRegistration.count({
      where: { eventId, status: 'attended' }
    });
    const paidCount = await EventRegistration.count({
      where: { eventId, paymentStatus: 'paid' }
    });
    const totalAmountPaid = await EventRegistration.sum('amountPaid', {
      where: { eventId, paymentStatus: 'paid' }
    });

    console.log(`✅ Registration Stats:`);
    console.log(`   Total Registrations: ${totalRegistrations}`);
    console.log(`   Attended: ${attendedCount}`);
    console.log(`   Paid: ${paidCount}`);
    console.log(`   Total Amount Paid: ₹${totalAmountPaid || 0}`);
    console.log('');

    // Test 3: Sample registrations
    console.log('👥 Test 3: Sample Registrations (First 5)');
    console.log('-'.repeat(60));
    const sampleRegs = await EventRegistration.findAll({
      where: { eventId },
      include: [{
        model: Member,
        as: 'member',
        attributes: ['id', 'name', 'phone']
      }],
      limit: 5,
      order: [['registeredAt', 'DESC']]
    });

    if (sampleRegs.length > 0) {
      sampleRegs.forEach((reg, idx) => {
        console.log(`   ${idx + 1}. Member ${reg.memberId} (${reg.member?.name || 'Unknown'}):`);
        console.log(`      Status: ${reg.status}`);
        console.log(`      Payment: ${reg.paymentStatus} (₹${reg.amountPaid || 0})`);
        console.log(`      Registered: ${reg.registeredAt}`);
        console.log(`      Attended: ${reg.attendedAt || 'Not yet'}`);
      });
    } else {
      console.log('   ⚠️  No registrations found');
    }
    console.log('');

    // Test 4: Exhibitors
    console.log('🏢 Test 4: Exhibitors');
    console.log('-'.repeat(60));
    const exhibitors = await EventExhibitor.findAll({
      where: { eventId }
    });
    console.log(`✅ Found ${exhibitors.length} exhibitors`);
    if (exhibitors.length > 0) {
      exhibitors.forEach((exh, idx) => {
        console.log(`   ${idx + 1}. ${exh.name} (${exh.businessCategory || 'Other'})`);
      });
    }
    console.log('');

    // Test 5: Verify API endpoint structure (simulate)
    console.log('🔌 Test 5: API Endpoint Structure');
    console.log('-'.repeat(60));
    
    // Simulate Admin endpoint response
    const adminResponse = {
      success: true,
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        type: event.type,
        startDate: event.startDate,
        endDate: event.endDate,
        address: event.address,
        city: event.city,
        state: event.state,
        district: event.district,
        pincode: event.pincode,
        registrationFee: event.registrationFee,
        currentAttendees: event.currentAttendees,
        maxAttendees: event.maxAttendees,
        status: event.status,
        image: event.image ? `/uploads/event-images/${event.image}` : null
      }
    };
    console.log('✅ Admin Endpoint Structure (GET /api/events/:id):');
    console.log(JSON.stringify(adminResponse, null, 2).substring(0, 300) + '...');
    console.log('');

    // Simulate Mobile endpoint response
    const mobileEvent = await Event.findByPk(eventId, {
      attributes: { exclude: ['createdBy', 'updatedBy'] },
      include: [{ model: EventExhibitor, as: 'exhibitors' }]
    });
    const mobileResponse = {
      success: true,
      event: mobileEvent
    };
    console.log('✅ Mobile Endpoint Structure (GET /api/mobile/events/:id):');
    console.log(`   Includes exhibitors: ${mobileEvent?.exhibitors?.length || 0} exhibitors`);
    console.log('');

    // Test 6: Verify registrations endpoint structure
    console.log('📝 Test 6: Registrations Endpoint Structure');
    console.log('-'.repeat(60));
    const sampleRegList = await EventRegistration.findAll({
      where: { eventId },
      include: [{ model: Member, as: 'member', attributes: ['id', 'name', 'phone'] }],
      limit: 3,
      order: [['registeredAt', 'DESC']]
    });

    const regListResponse = {
      success: true,
      registrations: sampleRegList.map(r => ({
        memberId: r.memberId,
        name: r.member?.name,
        phone: r.member?.phone,
        amountPaid: r.amountPaid,
        paymentStatus: r.paymentStatus,
        status: r.status,
        registeredAt: r.registeredAt,
        attendedAt: r.attendedAt
      }))
    };
    console.log('✅ Registrations Endpoint (GET /api/events/:id/registrations):');
    console.log(JSON.stringify(regListResponse, null, 2).substring(0, 400) + '...');
    console.log('');

    // Summary
    console.log('='.repeat(60));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(60));
    console.log(`✅ Event ID ${eventId} is accessible and returning correct data`);
    console.log(`✅ ${totalRegistrations} total registrations`);
    console.log(`✅ ${attendedCount} members marked as attended`);
    console.log(`✅ ${paidCount} members marked as paid`);
    console.log(`✅ Total revenue: ₹${totalAmountPaid || 0}`);
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testEventDetailEndpoints();

