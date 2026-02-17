const { Pool } = require('pg');
const XLSX = require('xlsx');

const pool = new Pool({
  connectionString: 'postgresql://mandap_db_gfrf_user:XOCuO1tzhHJ1IHJKjES4hVdDSFAGxiWk@dpg-d2tah46r433s73d7lbc0-a.oregon-postgres.render.com/mandap_db_gfrf',
  ssl: { rejectUnauthorized: false }
});

async function findExcelRecordsInDB() {
  try {
    console.log('Reading Excel file...');
    const workbook = XLSX.readFile('/home/mayur/Desktop/mandapam/Mandapam_RSL.xlsx');
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    console.log('Found', data.length, 'registrations in Excel file');
    
    await pool.connect();
    console.log('Connected to database');
    
    console.log('\n=== EXCEL RECORDS AND THEIR DATABASE MATCHES ===\n');
    
    let excelRecordsWithMatches = 0;
    let totalDBRecordsFound = 0;
    
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const Name = row.Name;
      const Phone = row.Phone;
      const AmountPaid = row['Amount Paid'];
      const RegisteredAt = row['Registered At'];
      const Attended = row.Attended;
      
      console.log(`${i + 1}. EXCEL RECORD: ${Name} | Phone: ${Phone} | Amount: ${AmountPaid} | Registered: ${RegisteredAt} | Attended: ${Attended}`);
      
      // Exact phone match in members table
      const memberExactQuery = `
        SELECT id, name, phone, email, business_name, created_at
        FROM members 
        WHERE phone = $1
      `;
      
      const memberExactResult = await pool.query(memberExactQuery, [Phone]);
      
      // Name similarity match in members table
      const memberNameQuery = `
        SELECT id, name, phone, email, business_name, created_at
        FROM members 
        WHERE LOWER(name) LIKE LOWER($1)
      `;
      
      const namePattern = `%${Name.replace(/\s+/g, '%')}%`;
      const memberNameResult = await pool.query(memberNameQuery, [namePattern]);
      
      // Event registrations for these members
      let eventRegistrations = { rows: [] };
      
      if (memberExactResult.rows.length > 0) {
        const memberIds = memberExactResult.rows.map(m => m.id);
        const eventQuery = `
          SELECT er.id, er.event_id, er.member_id, er.status, er.registered_at, 
                 er.amount_paid, er.payment_status, er.attended_at,
                 m.name as member_name, m.phone as member_phone
          FROM event_registrations er
          JOIN members m ON er.member_id = m.id
          WHERE er.member_id = ANY($1)
        `;
        
        eventRegistrations = await pool.query(eventQuery, [memberIds]);
      }
      
      // Display results
      let hasMatches = false;
      
      if (memberExactResult.rows.length > 0) {
        console.log('   DATABASE MATCHES (Exact Phone):');
        memberExactResult.rows.forEach(member => {
          console.log(`     Member ID: ${member.id}, Name: ${member.name}, Phone: ${member.phone}, Business: ${member.business_name || 'N/A'}`);
        });
        hasMatches = true;
        totalDBRecordsFound += memberExactResult.rows.length;
      }
      
      if (memberNameResult.rows.length > 0) {
        console.log('   DATABASE MATCHES (Similar Name):');
        memberNameResult.rows.forEach(member => {
          console.log(`     Member ID: ${member.id}, Name: ${member.name}, Phone: ${member.phone}, Business: ${member.business_name || 'N/A'}`);
        });
        hasMatches = true;
        totalDBRecordsFound += memberNameResult.rows.length;
      }
      
      if (eventRegistrations.rows.length > 0) {
        console.log('   EVENT REGISTRATIONS:');
        eventRegistrations.rows.forEach(reg => {
          console.log(`     Reg ID: ${reg.id}, Event ID: ${reg.event_id}, Member: ${reg.member_name}, Phone: ${reg.member_phone}, Status: ${reg.status}, Amount: ${reg.amount_paid}, Paid: ${reg.payment_status}`);
        });
        hasMatches = true;
        totalDBRecordsFound += eventRegistrations.rows.length;
      }
      
      if (!hasMatches) {
        console.log('   No database matches found');
      }
      
      if (hasMatches) {
        excelRecordsWithMatches++;
      }
      
      console.log(''); // Empty line for readability
    }
    
    console.log('=== SUMMARY ===');
    console.log(`Total Excel records processed: ${data.length}`);
    console.log(`Excel records with database matches: ${excelRecordsWithMatches}`);
    console.log(`Total database records found: ${totalDBRecordsFound}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

findExcelRecordsInDB();
