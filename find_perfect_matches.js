const { Pool } = require('pg');
const XLSX = require('xlsx');

const pool = new Pool({
  connectionString: 'postgresql://mandap_db_gfrf_user:XOCuO1tzhHJ1IHJKjES4hVdDSFAGxiWk@dpg-d2tah46r433s73d7lbc0-a.oregon-postgres.render.com/mandap_db_gfrf',
  ssl: { rejectUnauthorized: false }
});

async function findPerfectMatches() {
  try {
    console.log('Reading Excel file...');
    const workbook = XLSX.readFile('/home/mayur/Desktop/mandapam/Mandapam_RSL.xlsx');
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    console.log('Found', data.length, 'registrations in Excel file');
    
    await pool.connect();
    console.log('Connected to database');
    
    console.log('\n=== PERFECT MATCHES (Name + Phone) ===\n');
    
    let perfectMatches = 0;
    const matchedRecords = [];
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const Name = row.Name;
      const Phone = row.Phone;
      const AmountPaid = row['Amount Paid'];
      const RegisteredAt = row['Registered At'];
      const Attended = row.Attended;
      
      // Find exact match for both name and phone
      const exactMatchQuery = `
        SELECT id, name, phone, email, business_name, created_at
        FROM members 
        WHERE phone = $1 AND name = $2
      `;
      
      const exactMatchResult = await pool.query(exactMatchQuery, [Phone, Name]);
      
      if (exactMatchResult.rows.length > 0) {
        console.log(`${perfectMatches + 1}. PERFECT MATCH FOUND:`);
        console.log(`   Excel: ${Name} | Phone: ${Phone} | Amount: ${AmountPaid} | Registered: ${RegisteredAt} | Attended: ${Attended}`);
        
        exactMatchResult.rows.forEach(member => {
          console.log(`   Database: Member ID: ${member.id}, Name: ${member.name}, Phone: ${member.phone}, Business: ${member.business_name || 'N/A'}`);
        });
        
        // Get event registrations for this member
        const eventQuery = `
          SELECT er.id, er.event_id, er.member_id, er.status, er.registered_at, 
                 er.amount_paid, er.payment_status, er.attended_at
          FROM event_registrations er
          WHERE er.member_id = $1
        `;
        
        const eventResult = await pool.query(eventQuery, [exactMatchResult.rows[0].id]);
        
        if (eventResult.rows.length > 0) {
          console.log(`   Event Registrations:`);
          eventResult.rows.forEach(reg => {
            console.log(`     Reg ID: ${reg.id}, Event ID: ${reg.event_id}, Status: ${reg.status}, Amount: ${reg.amount_paid}, Paid: ${reg.payment_status}`);
          });
        }
        
        console.log(''); // Empty line for readability
        
        perfectMatches++;
        
        // Store for potential deletion
        matchedRecords.push({
          excelName: Name,
          excelPhone: Phone,
          memberRecords: exactMatchResult.rows,
          eventRegistrations: eventResult.rows
        });
      }
    }
    
    console.log('=== SUMMARY ===');
    console.log(`Total Excel records processed: ${data.length}`);
    console.log(`Perfect matches (Name + Phone): ${perfectMatches}`);
    
    if (perfectMatches > 0) {
      console.log('\nThese records can be safely deleted as they match perfectly.');
    }
    
    return matchedRecords;
    
  } catch (error) {
    console.error('Error:', error.message);
    return [];
  } finally {
    await pool.end();
  }
}

findPerfectMatches();
