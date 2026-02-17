const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://mandap_db_gfrf_user:XOCuO1tzhHJ1IHJKjES4hVdDSFAGxiWk@dpg-d2tah46r433s73d7lbc0-a.oregon-postgres.render.com/mandap_db_gfrf',
  ssl: { rejectUnauthorized: false }
});

async function exportDatabaseToCSV() {
  try {
    await pool.connect();
    console.log('Connected to database');
    
    // Get all members
    console.log('Fetching members...');
    const membersQuery = `
      SELECT id, name, business_name, address, city, state, pincode, phone, email, 
             gst_number, business_type, description, experience, rating, total_bookings,
             is_active, is_verified, birth_date, association_id, association_name,
             created_at, updated_at
      FROM members 
      ORDER BY created_at DESC
    `;
    
    const membersResult = await pool.query(membersQuery);
    console.log(`Found ${membersResult.rows.length} members`);
    
    // Get all event registrations
    console.log('Fetching event registrations...');
    const eventRegistrationsQuery = `
      SELECT er.id, er.event_id, er.member_id, er.status, er.registered_at, 
             er.notes, er.amount_paid, er.payment_status, er.payment_order_id, 
             er.payment_id, er.attended_at, er.pdf_path, er.pdf_sent_at,
             er.created_at, er.updated_at,
             m.name as member_name, m.phone as member_phone, m.email as member_email
      FROM event_registrations er
      JOIN members m ON er.member_id = m.id
      ORDER BY er.created_at DESC
    `;
    
    const eventRegistrationsResult = await pool.query(eventRegistrationsQuery);
    console.log(`Found ${eventRegistrationsResult.rows.length} event registrations`);
    
    // Create CSV content for members
    console.log('Creating members CSV...');
    const membersCSV = [
      // Header
      'ID,Name,Business Name,Address,City,State,Pincode,Phone,Email,GST Number,Business Type,Description,Experience,Rating,Total Bookings,Is Active,Is Verified,Birth Date,Association ID,Association Name,Created At,Updated At',
      // Data rows
      ...membersResult.rows.map(member => [
        member.id,
        `"${member.name || ''}"`,
        `"${member.business_name || ''}"`,
        `"${member.address || ''}"`,
        `"${member.city || ''}"`,
        `"${member.state || ''}"`,
        `"${member.pincode || ''}"`,
        `"${member.phone || ''}"`,
        `"${member.email || ''}"`,
        `"${member.gst_number || ''}"`,
        `"${member.business_type || ''}"`,
        `"${member.description || ''}"`,
        member.experience || 0,
        member.rating || 0,
        member.total_bookings || 0,
        member.is_active || false,
        member.is_verified || false,
        `"${member.birth_date || ''}"`,
        member.association_id || '',
        `"${member.association_name || ''}"`,
        `"${member.created_at || ''}"`,
        `"${member.updated_at || ''}"`
      ].join(','))
    ].join('\n');
    
    // Create CSV content for event registrations
    console.log('Creating event registrations CSV...');
    const eventRegistrationsCSV = [
      // Header
      'Registration ID,Event ID,Member ID,Member Name,Member Phone,Member Email,Status,Registered At,Notes,Amount Paid,Payment Status,Payment Order ID,Payment ID,Attended At,PDF Path,PDF Sent At,Created At,Updated At',
      // Data rows
      ...eventRegistrationsResult.rows.map(reg => [
        reg.id,
        reg.event_id,
        reg.member_id,
        `"${reg.member_name || ''}"`,
        `"${reg.member_phone || ''}"`,
        `"${reg.member_email || ''}"`,
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
        `"${reg.created_at || ''}"`,
        `"${reg.updated_at || ''}"`
      ].join(','))
    ].join('\n');
    
    // Write CSV files
    const membersFilePath = '/home/mayur/Desktop/mandapam/database_members.csv';
    const eventRegistrationsFilePath = '/home/mayur/Desktop/mandapam/database_event_registrations.csv';
    
    fs.writeFileSync(membersFilePath, membersCSV);
    fs.writeFileSync(eventRegistrationsFilePath, eventRegistrationsCSV);
    
    console.log('\n=== EXPORT COMPLETE ===');
    console.log(`Members CSV: ${membersFilePath}`);
    console.log(`Event Registrations CSV: ${eventRegistrationsFilePath}`);
    
    console.log('\n=== DATABASE STATISTICS ===');
    console.log(`Total Members: ${membersResult.rows.length}`);
    console.log(`Total Event Registrations: ${eventRegistrationsResult.rows.length}`);
    
    // Additional statistics
    const activeMembersCount = membersResult.rows.filter(m => m.is_active).length;
    const verifiedMembersCount = membersResult.rows.filter(m => m.is_verified).length;
    const paidRegistrationsCount = eventRegistrationsResult.rows.filter(r => r.payment_status === 'paid').length;
    const attendedRegistrationsCount = eventRegistrationsResult.rows.filter(r => r.attended_at).length;
    
    console.log(`Active Members: ${activeMembersCount}`);
    console.log(`Verified Members: ${verifiedMembersCount}`);
    console.log(`Paid Registrations: ${paidRegistrationsCount}`);
    console.log(`Attended Registrations: ${attendedRegistrationsCount}`);
    
    // Create summary file
    const summaryContent = `
DATABASE EXPORT SUMMARY
========================

Export Date: ${new Date().toISOString()}

MEMBERS
-------
Total Members: ${membersResult.rows.length}
Active Members: ${activeMembersCount}
Verified Members: ${verifiedMembersCount}

EVENT REGISTRATIONS
------------------
Total Event Registrations: ${eventRegistrationsResult.rows.length}
Paid Registrations: ${paidRegistrationsCount}
Attended Registrations: ${attendedRegistrationsCount}

FILES CREATED
-------------
1. ${membersFilePath}
2. ${eventRegistrationsFilePath}
`;
    
    const summaryFilePath = '/home/mayur/Desktop/mandapam/database_export_summary.txt';
    fs.writeFileSync(summaryFilePath, summaryContent);
    console.log(`Summary File: ${summaryFilePath}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

exportDatabaseToCSV();
