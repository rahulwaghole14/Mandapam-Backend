const { Pool } = require('pg');
const XLSX = require('xlsx');

const pool = new Pool({
  connectionString: 'postgresql://mandap_db_gfrf_user:XOCuO1tzhHJ1IHJKjES4hVdDSFAGxiWk@dpg-d2tah46r433s73d7lbc0-a.oregon-postgres.render.com/mandap_db_gfrf',
  ssl: { rejectUnauthorized: false }
});

async function checkDatabaseColumns() {
  try {
    await pool.connect();
    console.log('Connected to database');
    
    // Check event_registrations table columns
    console.log('\n=== EVENT_REGISTRATIONS TABLE COLUMNS ===');
    const eventColumnsQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'event_registrations'
      ORDER BY ordinal_position
    `;
    
    const eventResult = await pool.query(eventColumnsQuery);
    eventResult.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type}`);
    });
    
    // Check members table columns
    console.log('\n=== MEMBERS TABLE COLUMNS ===');
    const memberColumnsQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'members'
      ORDER BY ordinal_position
    `;
    
    const memberResult = await pool.query(memberColumnsQuery);
    memberResult.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type}`);
    });
    
  } catch (error) {
    console.error('Error checking columns:', error.message);
  } finally {
    await pool.end();
  }
}

async function findSimilarUsers() {
  try {
    console.log('Reading Excel file...');
    const workbook = XLSX.readFile('/home/mayur/Desktop/mandapam/Mandapam_RSL.xlsx');
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    console.log('Found', data.length, 'registrations in Excel file');
    
    await pool.connect();
    console.log('Connected to database');
    
    let totalMatches = 0;
    
    for (const row of data) {
      const Name = row.Name;
      const Phone = row.Phone;
      
      console.log(`\nSearching for: ${Name} (${Phone})`);
      
      const namePattern = `%${Name.replace(/\s+/g, '%')}%`;
      const phonePattern = `%${Phone.toString().slice(-4)}%`;
      
      // Try different column names for phone
      const phoneColumns = ['phone', 'phone_number', 'mobile', 'contact', 'contact_number'];
      
      let eventResult = { rows: [] };
      
      for (const phoneCol of phoneColumns) {
        try {
          const eventQuery = `SELECT id, event_id, member_id, ${phoneCol} as phone, name FROM event_registrations WHERE ${phoneCol} = $1 OR LOWER(name) LIKE LOWER($2) OR ${phoneCol} LIKE $3`;
          eventResult = await pool.query(eventQuery, [Phone, namePattern, phonePattern]);
          if (eventResult.rows.length > 0) {
            console.log(`Found matches using column: ${phoneCol}`);
            break;
          }
        } catch (err) {
          // Column doesn't exist, try next one
          continue;
        }
      }
      
      let memberResult = { rows: [] };
      
      for (const phoneCol of phoneColumns) {
        try {
          const memberQuery = `SELECT id, name, ${phoneCol} as phone FROM members WHERE ${phoneCol} = $1 OR LOWER(name) LIKE LOWER($2) OR ${phoneCol} LIKE $3`;
          memberResult = await pool.query(memberQuery, [Phone, namePattern, phonePattern]);
          if (memberResult.rows.length > 0) {
            console.log(`Found member matches using column: ${phoneCol}`);
            break;
          }
        } catch (err) {
          // Column doesn't exist, try next one
          continue;
        }
      }
      
      if (eventResult.rows.length > 0 || memberResult.rows.length > 0) {
        console.log(`\n=== MATCH FOUND: ${Name} (${Phone}) ===`);
        if (eventResult.rows.length > 0) {
          console.log('Event Registrations:');
          eventResult.rows.forEach(reg => console.log(`  - ID: ${reg.id}, Name: ${reg.name}, Phone: ${reg.phone}, Event: ${reg.event_id}`));
        }
        if (memberResult.rows.length > 0) {
          console.log('Member Records:');
          memberResult.rows.forEach(member => console.log(`  - ID: ${member.id}, Name: ${member.name}, Phone: ${member.phone}`));
        }
        totalMatches += eventResult.rows.length + memberResult.rows.length;
      } else {
        console.log('No matches found');
      }
    }
    
    console.log(`\nTotal database records found: ${totalMatches}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log('=== CHECKING DATABASE COLUMNS ===');
  await checkDatabaseColumns();
  
  console.log('\n=== FINDING SIMILAR USERS ===');
  await findSimilarUsers();
}

main();
