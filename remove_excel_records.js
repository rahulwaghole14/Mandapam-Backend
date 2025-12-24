const { Pool } = require('pg');
const XLSX = require('xlsx');

const pool = new Pool({
  connectionString: 'postgresql://mandap_db_gfrf_user:XOCuO1tzhHJ1IHJKjES4hVdDSFAGxiWk@dpg-d2tah46r433s73d7lbc0-a.oregon-postgres.render.com/mandap_db_gfrf',
  ssl: { rejectUnauthorized: false }
});

async function removeExcelRecords() {
  const client = await pool.connect();
  try {
    console.log('Connected to database');
    
    // Read Excel file
    console.log('Reading Excel file...');
    const workbook = XLSX.readFile('/home/mayur/Desktop/mandapam/Mandapam_RSL.xlsx');
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    console.log(`Found ${data.length} records in Excel file`);

    // Find matching records in database
    console.log('\nFinding matching records in database...');
    const recordsToDelete = [];
    
    for (const row of data) {
      const name = row.Name;
      const phone = row.Phone;
      
      const query = `
        SELECT er.id as registration_id, m.id as member_id, m.name, m.phone, 
               er.event_id, er.registered_at, er.amount_paid
        FROM members m
        JOIN event_registrations er ON m.id = er.member_id
        WHERE m.name = $1 AND m.phone = $2
      `;
      
      const result = await client.query(query, [name, phone]);
      
      if (result.rows.length > 0) {
        console.log(`\nFound ${result.rows.length} registrations for ${name} (${phone}):`);
        result.rows.forEach(record => {
          console.log(`  Registration ID: ${record.registration_id}, Event ID: ${record.event_id}, Amount: ${record.amount_paid}, Registered: ${record.registered_at}`);
          recordsToDelete.push(record);
        });
      }
    }

    if (recordsToDelete.length === 0) {
      console.log('\nNo matching records found to delete.');
      return;
    }

    console.log(`\nTotal records to delete: ${recordsToDelete.length}`);
    console.log('\nWARNING: This will permanently delete the above records from the database.');
    
    // Delete records
    console.log('\nDeleting records...');
    let deletedCount = 0;
    
    for (const record of recordsToDelete) {
      try {
        await client.query('DELETE FROM event_registrations WHERE id = $1', [record.registration_id]);
        console.log(`Deleted registration ${record.registration_id} for ${record.name}`);
        deletedCount++;
      } catch (error) {
        console.error(`Error deleting registration ${record.registration_id}:`, error.message);
      }
    }
    
    console.log(`\nDeletion complete! Deleted ${deletedCount} records.`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

removeExcelRecords();
