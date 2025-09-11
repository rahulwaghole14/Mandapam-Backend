const { sequelize } = require('./config/database');

async function fixServerDatabase() {
  try {
    console.log('🔧 Fixing Server Database Schema...\n');
    
    // First, let's check the current state
    console.log('📝 Checking current events table structure...');
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'events' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Current columns:');
    results.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    const hasAssociationId = results.some(col => col.column_name === 'association_id');
    
    if (!hasAssociationId) {
      console.log('\n❌ association_id column is missing from database');
      console.log('📝 Adding association_id column temporarily to fix the error...');
      
      try {
        await sequelize.query(`
          ALTER TABLE events 
          ADD COLUMN association_id INTEGER;
        `);
        console.log('✅ Added association_id column');
      } catch (error) {
        console.log(`❌ Failed to add association_id column: ${error.message}`);
      }
    } else {
      console.log('\n✅ association_id column exists in database');
    }
    
    // Now let's ensure all required columns exist
    const requiredColumns = ['created_by', 'updated_by', 'district', 'status', 'priority'];
    const existingColumns = results.map(col => col.column_name);
    
    console.log('\n📝 Ensuring all required columns exist...');
    for (const column of requiredColumns) {
      if (!existingColumns.includes(column)) {
        console.log(`❌ Missing column: ${column} - adding it...`);
        
        try {
          switch (column) {
            case 'created_by':
              await sequelize.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id);`);
              break;
            case 'updated_by':
              await sequelize.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS updated_by INTEGER REFERENCES users(id);`);
              break;
            case 'district':
              await sequelize.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS district VARCHAR(100);`);
              break;
            case 'status':
              await sequelize.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'Upcoming' CHECK (status IN ('Upcoming', 'Ongoing', 'Completed', 'Cancelled', 'Postponed'));`);
              break;
            case 'priority':
              await sequelize.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Urgent'));`);
              break;
          }
          console.log(`✅ Added column: ${column}`);
        } catch (error) {
          console.log(`❌ Failed to add column ${column}: ${error.message}`);
        }
      } else {
        console.log(`✅ Column exists: ${column}`);
      }
    }
    
    // Update existing records with default values
    console.log('\n📝 Updating existing records with default values...');
    try {
      await sequelize.query(`
        UPDATE events 
        SET 
          created_by = 1,
          updated_by = 1,
          status = 'Upcoming',
          priority = 'Medium',
          association_id = NULL
        WHERE created_by IS NULL OR updated_by IS NULL OR status IS NULL OR priority IS NULL;
      `);
      console.log('✅ Updated existing records');
    } catch (error) {
      console.log(`⚠️  Update warning: ${error.message}`);
    }
    
    // Verify final structure
    console.log('\n📝 Verifying final table structure...');
    const [finalResults] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'events' 
      ORDER BY ordinal_position;
    `);
    
    console.log('Final events table columns:');
    finalResults.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    console.log('\n🎯 Database Fix Complete!');
    console.log('✅ Events table should now work with the updated code');
    console.log('💡 The association_id column is present but nullable, so it won\'t cause errors');
    
  } catch (error) {
    console.error('❌ Database fix error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

// Run the fix
fixServerDatabase();
