const { Pool } = require('pg');
const XLSX = require('xlsx');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://mandap_db_gfrf_user:XOCuO1tzhHJ1IHJKjES4hVdDSFAGxiWk@dpg-d2tah46r433s73d7lbc0-a.oregon-postgres.render.com/mandap_db_gfrf',
  ssl: {
    rejectUnauthorized: false
  }
});

async function removeRegistrationsFromExcel() {
  try {
    console.log('Reading Excel file...');
    
    // Read Excel file
    const workbook = XLSX.readFile('/home/mayur/Desktop/mandapam/Mandapam_RSL.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    console.log(`Found ${data.length} registrations in Excel file`);
    
    // Connect to database
    await pool.connect();
    console.log('Connected to database');
    
    let removedCount = 0;
    let notFoundCount = 0;
    
    for (const row of data) {
      const Name = row.Name;
      const Phone = row.Phone;
      const AmountPaid = row['Amount Paid'];
      const RegisteredAt = row['Registered At'];
      const Attended = row.Attended;
      
      console.log(`Processing: ${Name} (${Phone})`);
      
      // Try to find and delete registration by phone number and similar name
      try {
        // First try to find in event_registrations table with fuzzy matching
        const findQuery = `
          SELECT id, event_id, member_id, phone, name 
          FROM event_registrations 
          WHERE phone = $1 OR LOWER(name) LIKE LOWER($2) OR phone LIKE $3
        `;
        
        const namePattern = `%${Name.replace(/\s+/g, '%')}%`;
        const phonePattern = `%${Phone.toString().slice(-4)}%`; // Match last 4 digits
        
        const result = await pool.query(findQuery, [Phone, namePattern, phonePattern]);
        
        if (result.rows.length > 0) {
          console.log(`Found ${result.rows.length} registration(s) for ${Name} (${Phone})`);
          
          // Delete found registrations
          for (const reg of result.rows) {
            const deleteQuery = `DELETE FROM event_registrations WHERE id = $1`;
            await pool.query(deleteQuery, [reg.id]);
            console.log(`Deleted registration ID: ${reg.id} (Event: ${reg.event_id}, Member: ${reg.member_id}, Name: ${reg.name}, Phone: ${reg.phone})`);
            removedCount++;
          }
        } else {
          // Try to find in members table with fuzzy matching
          const memberQuery = `
            SELECT id, name, phone 
            FROM members 
            WHERE phone = $1 OR LOWER(name) LIKE LOWER($2) OR phone LIKE $3
          `;
          
          const memberResult = await pool.query(memberQuery, [Phone, namePattern, phonePattern]);
          
          if (memberResult.rows.length > 0) {
            console.log(`Found member record(s) for ${Name} (${Phone})`);
            
            // Delete member records
            for (const member of memberResult.rows) {
              const deleteMemberQuery = `DELETE FROM members WHERE id = $1`;
              await pool.query(deleteMemberQuery, [member.id]);
              console.log(`Deleted member ID: ${member.id} (${member.name}, ${member.phone})`);
              removedCount++;
            }
          } else {
            console.log(`No registration found for ${Name} (${Phone})`);
            notFoundCount++;
          }
        }
      } catch (error) {
        console.error(`Error processing ${Name} (${Phone}):`, error.message);
      }
    }
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`Total registrations in Excel: ${data.length}`);
    console.log(`Successfully removed: ${removedCount}`);
    console.log(`Not found in database: ${notFoundCount}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
    console.log('Database connection closed');
  }
}

removeRegistrationsFromExcel();
