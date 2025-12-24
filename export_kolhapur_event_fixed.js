const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: 'postgresql://mandap_db_gfrf_user:XOCuO1tzhHJ1IHJKjES4hVdDSFAGxiWk@dpg-d2tah46r433s73d7lbc0-a.oregon-postgres.render.com/mandap_db_gfrf',
  ssl: { rejectUnauthorized: false }
});

async function checkEventsTableStructure() {
  try {
    await pool.connect();
    console.log('Connected to database');
    
    // Check events table columns
    console.log('\n=== EVENTS TABLE COLUMNS ===');
    const eventsColumnsQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'events'
      ORDER BY ordinal_position
    `;
    
    const eventsResult = await pool.query(eventsColumnsQuery);
    eventsResult.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type}`);
    });
    
  } catch (error) {
    console.error('Error checking events table:', error.message);
  } finally {
    await pool.end();
  }
}

async function exportKolhapurEventToCSV() {
  try {
    await pool.connect();
    console.log('Connected to database');
    
    // First, find Kolhapur events
    console.log('Finding Kolhapur events...');
    const kolhapurEventsQuery = `
      SELECT id, title, description, city, venue, created_at
      FROM events 
      WHERE LOWER(city) LIKE LOWER('%kolhapur%') OR LOWER(title) LIKE LOWER('%kolhapur%')
      ORDER BY created_at DESC
    `;
    
    const kolhapurEventsResult = await pool.query(kolhapurEventsQuery);
    console.log(`Found ${kolhapurEventsResult.rows.length} Kolhapur events`);
    
    if (kolhapurEventsResult.rows.length === 0) {
      console.log('No Kolhapur events found. Checking all events...');
      
      // Show all events to help identify Kolhapur events
      const allEventsQuery = `
        SELECT id, title, city, venue, created_at
        FROM events 
        ORDER BY created_at DESC
        LIMIT 10
      `;
      
      const allEventsResult = await pool.query(allEventsQuery);
      console.log('Recent events:');
      allEventsResult.rows.forEach(event => {
        console.log(`  ID: ${event.id}, Title: ${event.title}, City: ${event.city}, Created: ${event.created_at}`);
      });
      return;
    }
    
    // Display Kolhapur events found
    console.log('\nKolhapur Events Found:');
    kolhapurEventsResult.rows.forEach(event => {
      console.log(`  Event ID: ${event.id}, Title: ${event.title}, City: ${event.city}, Created: ${event.created_at}, Venue: ${event.venue}`);
    });
    
    // Get event registrations for all Kolhapur events
    const kolhapurEventIds = kolhapurEventsResult.rows.map(e => e.id);
    
    console.log('\nFetching registrations for Kolhapur events...');
    const kolhapurRegistrationsQuery = `
      SELECT 
        er.id as registration_id,
        er.event_id,
        er.member_id,
        er.status,
        er.registered_at,
        er.notes,
        er.amount_paid,
        er.payment_status,
        er.payment_order_id,
        er.payment_id,
        er.attended_at,
        er.pdf_path,
        er.pdf_sent_at,
        er.created_at as registration_created_at,
        er.updated_at as registration_updated_at,
        m.name as member_name,
        m.phone as member_phone,
        m.email as member_email,
        m.business_name,
        m.business_type,
        m.city as member_city,
        m.state as member_state,
        e.title as event_title,
        e.venue as event_venue
      FROM event_registrations er
      JOIN members m ON er.member_id = m.id
      JOIN events e ON er.event_id = e.id
      WHERE er.event_id = ANY($1)
      ORDER BY er.event_id, er.registered_at DESC
    `;
    
    const kolhapurRegistrationsResult = await pool.query(kolhapurRegistrationsQuery, [kolhapurEventIds]);
    console.log(`Found ${kolhapurRegistrationsResult.rows.length} registrations for Kolhapur events`);
    
    if (kolhapurRegistrationsResult.rows.length === 0) {
      console.log('No registrations found for Kolhapur events');
      return;
    }
    
    // Create CSV content
    console.log('Creating Kolhapur event registrations CSV...');
    const csvHeader = 'Registration ID,Event ID,Event Title,Event Venue,Member ID,Member Name,Member Phone,Member Email,Business Name,Business Type,Member City,Member State,Status,Registered At,Notes,Amount Paid,Payment Status,Payment Order ID,Payment ID,Attended At,PDF Path,PDF Sent At,Registration Created At,Registration Updated At';
    
    const csvRows = kolhapurRegistrationsResult.rows.map(reg => [
      reg.registration_id,
      reg.event_id,
      `"${reg.event_title || ''}"`,
      `"${reg.event_venue || ''}"`,
      reg.member_id,
      `"${reg.member_name || ''}"`,
      `"${reg.member_phone || ''}"`,
      `"${reg.member_email || ''}"`,
      `"${reg.business_name || ''}"`,
      `"${reg.business_type || ''}"`,
      `"${reg.member_city || ''}"`,
      `"${reg.member_state || ''}"`,
      `"${reg.status || ''}"`,
      `"${reg.registered_at || ''}"`,
      `"${reg.notes || ''}"`,
      reg.amount_paid || 0,
      `"${reg.payment_status || ''}"`,
      `"${reg.payment_order_id || ''}"`,
      `"${reg.payment_id || ''}"`,
      `"${reg.attended_at || ''}"`,
      `"${reg.pdf_path || ''}"`,
      `"${reg.pdf_sent_at || ''}"`,
      `"${reg.registration_created_at || ''}"`,
      `"${reg.registration_updated_at || ''}"`
    ].join(','));
    
    const csvContent = [csvHeader, ...csvRows].join('\n');
    
    // Write CSV file
    const csvFilePath = '/home/mayur/Desktop/mandapam/kolhapur_event_registrations.csv';
    fs.writeFileSync(csvFilePath, csvContent);
    
    console.log('\n=== KOLHAPUR EVENT EXPORT COMPLETE ===');
    console.log(`CSV File: ${csvFilePath}`);
    
    // Statistics
    const paidCount = kolhapurRegistrationsResult.rows.filter(r => r.payment_status === 'paid').length;
    const attendedCount = kolhapurRegistrationsResult.rows.filter(r => r.attended_at).length;
    const totalAmount = kolhapurRegistrationsResult.rows.reduce((sum, r) => sum + (parseFloat(r.amount_paid) || 0), 0);
    
    console.log('\n=== KOLHAPUR EVENT STATISTICS ===');
    console.log(`Total Registrations: ${kolhapurRegistrationsResult.rows.length}`);
    console.log(`Paid Registrations: ${paidCount}`);
    console.log(`Attended Registrations: ${attendedCount}`);
    console.log(`Total Amount Collected: ₹${totalAmount.toFixed(2)}`);
    
    // Group by event
    console.log('\n=== REGISTRATIONS BY EVENT ===');
    const registrationsByEvent = {};
    kolhapurRegistrationsResult.rows.forEach(reg => {
      if (!registrationsByEvent[reg.event_id]) {
        registrationsByEvent[reg.event_id] = {
          title: reg.event_title,
          total: 0,
          paid: 0,
          attended: 0,
          amount: 0
        };
      }
      registrationsByEvent[reg.event_id].total++;
      if (reg.payment_status === 'paid') registrationsByEvent[reg.event_id].paid++;
      if (reg.attended_at) registrationsByEvent[reg.event_id].attended++;
      registrationsByEvent[reg.event_id].amount += parseFloat(reg.amount_paid) || 0;
    });
    
    Object.values(registrationsByEvent).forEach(event => {
      console.log(`Event: ${event.title}`);
      console.log(`  Total: ${event.total}, Paid: ${event.paid}, Attended: ${event.attended}, Amount: ₹${event.amount.toFixed(2)}`);
    });
    
    // Create summary file
    const summaryContent = `
KOLHAPUR EVENT REGISTRATIONS EXPORT SUMMARY
===========================================

Export Date: ${new Date().toISOString()}

EVENTS FOUND: ${kolhapurEventsResult.rows.length}
${kolhapurEventsResult.rows.map(e => `- ${e.title} (ID: ${e.id}, Created: ${e.created_at})`).join('\n')}

REGISTRATIONS
-------------
Total Registrations: ${kolhapurRegistrationsResult.rows.length}
Paid Registrations: ${paidCount}
Attended Registrations: ${attendedCount}
Total Amount Collected: ₹${totalAmount.toFixed(2)}

FILE CREATED
------------
${csvFilePath}

REGISTRATIONS BY EVENT
---------------------
${Object.values(registrationsByEvent).map(event => 
  `${event.title}:\n  Total: ${event.total}, Paid: ${event.paid}, Attended: ${event.attended}, Amount: ₹${event.amount.toFixed(2)}`
).join('\n\n')}
`;
    
    const summaryFilePath = '/home/mayur/Desktop/mandapam/kolhapur_event_summary.txt';
    fs.writeFileSync(summaryFilePath, summaryContent);
    console.log(`Summary File: ${summaryFilePath}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log('=== CHECKING EVENTS TABLE STRUCTURE ===');
  await checkEventsTableStructure();
  
  console.log('\n=== EXPORTING KOLHAPUR EVENT REGISTRATIONS ===');
  await exportKolhapurEventToCSV();
}

main();
