const { Pool } = require('pg');
const XLSX = require('xlsx');
const readline = require('readline');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://mandap_db_gfrf_user:XOCuO1tzhHJ1IHJKjES4hVdDSFAGxiWk@dpg-d2tah46r433s73d7lbc0-a.oregon-postgres.render.com/mandap_db_gfrf',
  ssl: {
    rejectUnauthorized: false
  }
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function checkDatabaseStructure() {
  try {
    await pool.connect();
    console.log('Connected to database');
    
    // Check table structures
    console.log('\n=== DATABASE TABLES ===');
    
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    const tablesResult = await pool.query(tablesQuery);
    console.log('Tables found:');
    tablesResult.rows.forEach(row => console.log(`- ${row.table_name}`));
    
    // Check event_registrations table structure
    console.log('\n=== EVENT_REGISTRATIONS TABLE STRUCTURE ===');
    const eventRegColumnsQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'event_registrations'
      ORDER BY ordinal_position
    `;
    
    const eventRegResult = await pool.query(eventRegColumnsQuery);
    eventRegResult.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check members table structure
    console.log('\n=== MEMBERS TABLE STRUCTURE ===');
    const memberColumnsQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'members'
      ORDER BY ordinal_position
    `;
    
    const memberResult = await pool.query(memberColumnsQuery);
    memberResult.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
  } catch (error) {
    console.error('Error checking database structure:', error.message);
  } finally {
    await pool.end();
  }
}

async function findSimilarUsers() {
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
    
    console.log('\n=== SEARCHING FOR SIMILAR USERS ===');
    
    const allMatches = [];
    
    for (const row of data) {
      const Name = row.Name;
      const Phone = row.Phone;
      const AmountPaid = row['Amount Paid'];
      const RegisteredAt = row['Registered At'];
      const Attended = row.Attended;
      
      console.log(`\nSearching for: ${Name} (${Phone})`);
      
      // Find in event_registrations table with fuzzy matching
      const findEventQuery = `
        SELECT id, event_id, member_id, phone, name, email, created_at
        FROM event_registrations 
        WHERE phone = $1 OR LOWER(name) LIKE LOWER($2) OR phone LIKE $3
      `;
      
      const namePattern = `%${Name.replace(/\s+/g, '%')}%`;
      const phonePattern = `%${Phone.toString().slice(-4)}%`; // Match last 4 digits
      
      const eventResult = await pool.query(findEventQuery, [Phone, namePattern, phonePattern]);
      
      // Find in members table with fuzzy matching
      const findMemberQuery = `
        SELECT id, name, phone, email, created_at
        FROM members 
        WHERE phone = $1 OR LOWER(name) LIKE LOWER($2) OR phone LIKE $3
      `;
      
      const memberResult = await pool.query(findMemberQuery, [Phone, namePattern, phonePattern]);
      
      if (eventResult.rows.length > 0 || memberResult.rows.length > 0) {
        const match = {
          excelName: Name,
          excelPhone: Phone,
          eventRegistrations: eventResult.rows,
          memberRecords: memberResult.rows
        };
        allMatches.push(match);
        
        console.log(`FOUND MATCHES:`);
        if (eventResult.rows.length > 0) {
          console.log(`  Event Registrations (${eventResult.rows.length}):`);
          eventResult.rows.forEach(reg => {
            console.log(`    - ID: ${reg.id}, Name: ${reg.name}, Phone: ${reg.phone}, Event: ${reg.event_id}`);
          });
        }
        
        if (memberResult.rows.length > 0) {
          console.log(`  Member Records (${memberResult.rows.length}):`);
          memberResult.rows.forEach(member => {
            console.log(`    - ID: ${member.id}, Name: ${member.name}, Phone: ${member.phone}`);
          });
        }
      } else {
        console.log('No matches found');
      }
    }
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`Total Excel entries: ${data.length}`);
    console.log(`Entries with matches: ${allMatches.length}`);
    console.log(`Total matches found: ${allMatches.reduce((sum, match) => sum + match.eventRegistrations.length + match.memberRecords.length, 0)}`);
    
    return allMatches;
    
  } catch (error) {
    console.error('Error:', error.message);
    return [];
  } finally {
    await pool.end();
  }
}

async function askForConfirmation(matches) {
  return new Promise((resolve) => {
    console.log('\n=== CONFIRMATION REQUIRED ===');
    console.log(`Found ${matches.length} Excel entries with matching database records.`);
    console.log('Do you want to proceed with deleting all these records? (yes/no)');
    
    rl.question('Enter your choice: ', (answer) => {
      if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
        console.log('Confirmation received. Proceeding with deletion...');
        resolve(true);
      } else {
        console.log('Deletion cancelled by user.');
        resolve(false);
      }
      rl.close();
    });
  });
}

async function deleteConfirmedRecords(matches) {
  try {
    await pool.connect();
    console.log('Connected to database for deletion...');
    
    let deletedCount = 0;
    
    for (const match of matches) {
      console.log(`\nDeleting records for: ${match.excelName} (${match.excelPhone})`);
      
      // Delete event registrations
      for (const reg of match.eventRegistrations) {
        const deleteEventQuery = `DELETE FROM event_registrations WHERE id = $1`;
        await pool.query(deleteEventQuery, [reg.id]);
        console.log(`  Deleted event registration ID: ${reg.id}`);
        deletedCount++;
      }
      
      // Delete member records
      for (const member of match.memberRecords) {
        const deleteMemberQuery = `DELETE FROM members WHERE id = $1`;
        await pool.query(deleteMemberQuery, [member.id]);
        console.log(`  Deleted member ID: ${member.id}`);
        deletedCount++;
      }
    }
    
    console.log(`\n=== DELETION COMPLETE ===`);
    console.log(`Total records deleted: ${deletedCount}`);
    
  } catch (error) {
    console.error('Error during deletion:', error.message);
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log('=== REGISTRATION REMOVAL TOOL ===');
  console.log('Step 1: Checking database structure...');
  await checkDatabaseStructure();
  
  console.log('\nStep 2: Finding similar users...');
  const matches = await findSimilarUsers();
  
  if (matches.length > 0) {
    const confirmed = await askForConfirmation(matches);
    if (confirmed) {
      await deleteConfirmedRecords(matches);
    }
  } else {
    console.log('No matching records found. Nothing to delete.');
  }
}

main();
