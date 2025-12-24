const { Pool } = require('pg');
const XLSX = require('xlsx');

const pool = new Pool({
  connectionString: 'postgresql://mandap_db_gfrf_user:XOCuO1tzhHJ1IHJKjES4hVdDSFAGxiWk@dpg-d2tah46r433s73d7lbc0-a.oregon-postgres.render.com/mandap_db_gfrf',
  ssl: { rejectUnauthorized: false }
});

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
      
      // Find in members table first (has phone column)
      const memberQuery = `
        SELECT id, name, phone, email, business_name
        FROM members 
        WHERE phone = $1 OR LOWER(name) LIKE LOWER($2) OR phone LIKE $3
      `;
      
      const memberResult = await pool.query(memberQuery, [Phone, namePattern, phonePattern]);
      
      // Find in event_registrations by joining with members to get phone info
      let eventResult = { rows: [] };
      
      if (memberResult.rows.length > 0) {
        // If we found members, check their event registrations
        const memberIds = memberResult.rows.map(m => m.id);
        const eventQuery = `
          SELECT er.id, er.event_id, er.member_id, er.status, er.registered_at, 
                 m.name as member_name, m.phone as member_phone
          FROM event_registrations er
          JOIN members m ON er.member_id = m.id
          WHERE er.member_id = ANY($1)
        `;
        
        eventResult = await pool.query(eventQuery, [memberIds]);
      } else {
        // If no members found by phone/name, try searching event registrations by name pattern
        const eventByNameQuery = `
          SELECT er.id, er.event_id, er.member_id, er.status, er.registered_at,
                 m.name as member_name, m.phone as member_phone
          FROM event_registrations er
          JOIN members m ON er.member_id = m.id
          WHERE LOWER(m.name) LIKE LOWER($1)
        `;
        
        eventResult = await pool.query(eventByNameQuery, [namePattern]);
      }
      
      if (memberResult.rows.length > 0 || eventResult.rows.length > 0) {
        console.log(`\n=== MATCH FOUND: ${Name} (${Phone}) ===`);
        
        if (memberResult.rows.length > 0) {
          console.log('Member Records:');
          memberResult.rows.forEach(member => {
            console.log(`  - ID: ${member.id}, Name: ${member.name}, Phone: ${member.phone}, Business: ${member.business_name || 'N/A'}`);
          });
        }
        
        if (eventResult.rows.length > 0) {
          console.log('Event Registrations:');
          eventResult.rows.forEach(reg => {
            console.log(`  - Reg ID: ${reg.id}, Event ID: ${reg.event_id}, Member ID: ${reg.member_id}, Name: ${reg.member_name}, Phone: ${reg.member_phone}, Status: ${reg.status}`);
          });
        }
        
        totalMatches += memberResult.rows.length + eventResult.rows.length;
      } else {
        console.log('No matches found');
      }
    }
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`Total Excel entries: ${data.length}`);
    console.log(`Total database records found: ${totalMatches}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

findSimilarUsers();
