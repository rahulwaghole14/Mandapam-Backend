const { Client } = require('pg');

const DATABASE_URL = 'postgresql://mandap_db_gfrf_user:XOCuO1tzhHJ1IHJKjES4hVdDSFAGxiWk@dpg-d2tah46r433s73d7lbc0-a.oregon-postgres.render.com/mandap_db_gfrf';

async function runEssentialMigrations() {
  const client = new Client(DATABASE_URL);
  
  try {
    console.log('🔗 Connecting to production database...');
    await client.connect();
    console.log('✅ Connected to database\n');

    // Start transaction for safety
    await client.query('BEGIN');
    console.log('🔄 Transaction started');

    try {
      // Migration 1: Make business_type nullable (ESSENTIAL for frontend)
      console.log('📝 Migration 1: Making business_type nullable...');
      
      const checkColumn1 = await client.query(`
        SELECT column_name, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'members' 
        AND column_name = 'business_type'
      `);
      
      if (checkColumn1.rows.length > 0 && checkColumn1.rows[0].is_nullable === 'NO') {
        await client.query(`
          ALTER TABLE members 
          ALTER COLUMN business_type DROP NOT NULL
        `);
        console.log('✅ business_type is now nullable');
      } else {
        console.log('ℹ️ business_type is already nullable or column not found');
      }

      // Migration 2: Add cash_receipt_number column (ESSENTIAL for cash payments)
      console.log('📝 Migration 2: Adding cash_receipt_number column...');
      
      const checkColumn2 = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'event_registrations' 
        AND column_name = 'cash_receipt_number'
      `);
      
      if (checkColumn2.rows.length === 0) {
        await client.query(`
          ALTER TABLE event_registrations 
          ADD COLUMN cash_receipt_number VARCHAR(100)
        `);
        console.log('✅ cash_receipt_number column added');
      } else {
        console.log('ℹ️ cash_receipt_number column already exists');
      }

      // Commit transaction
      await client.query('COMMIT');
      console.log('✅ Transaction committed successfully\n');

      // Verify changes
      console.log('🔍 Verifying changes...');
      const verification = await client.query(`
        SELECT 
          table_name,
          column_name,
          data_type,
          is_nullable,
          character_maximum_length
        FROM information_schema.columns 
        WHERE table_name IN ('members', 'event_registrations') 
        AND column_name IN ('business_type', 'cash_receipt_number')
        ORDER BY table_name, column_name
      `);

      console.log('\n📋 Current schema:');
      verification.rows.forEach(row => {
        console.log(`  ${row.table_name}.${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });

      console.log('\n🎉 ESSENTIAL MIGRATIONS COMPLETED SUCCESSFULLY!');
      console.log('📱 Frontend manual registration form will now work properly.');

    } catch (migrationError) {
      // Rollback on any error
      await client.query('ROLLBACK');
      console.error('❌ Migration failed, transaction rolled back:', migrationError.message);
      throw migrationError;
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
    throw error;
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Run migrations
runEssentialMigrations().catch(console.error);
