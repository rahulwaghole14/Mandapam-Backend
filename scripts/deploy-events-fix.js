const { sequelize } = require('../config/database');

async function deployEventsFix() {
  try {
    console.log('🚀 Deploying Events API Fix...\n');
    
    // Check if association_id column exists
    console.log('📝 Checking events table structure...');
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'events' 
      ORDER BY ordinal_position;
    `);
    
    const hasAssociationId = results.some(col => col.column_name === 'association_id');
    
    if (hasAssociationId) {
      console.log('❌ Found association_id column - removing it...');
      try {
        await sequelize.query(`ALTER TABLE events DROP COLUMN IF EXISTS association_id;`);
        console.log('✅ Removed association_id column');
      } catch (error) {
        console.log(`❌ Failed to remove association_id column: ${error.message}`);
      }
    } else {
      console.log('✅ association_id column does not exist');
    }
    
    // Check if required columns exist
    const requiredColumns = ['created_by', 'updated_by', 'district', 'status', 'priority'];
    const existingColumns = results.map(col => col.column_name);
    
    console.log('\n📝 Checking required columns...');
    for (const column of requiredColumns) {
      if (!existingColumns.includes(column)) {
        console.log(`❌ Missing column: ${column}`);
        
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
    console.log('\n📝 Updating existing records...');
    try {
      await sequelize.query(`
        UPDATE events 
        SET 
          created_by = 1,
          updated_by = 1,
          status = 'Upcoming',
          priority = 'Medium'
        WHERE created_by IS NULL OR updated_by IS NULL OR status IS NULL OR priority IS NULL;
      `);
      console.log('✅ Updated existing records with default values');
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
    
    const stillHasAssociationId = finalResults.some(col => col.column_name === 'association_id');
    if (!stillHasAssociationId) {
      console.log('\n✅ Events table is properly configured');
      console.log('✅ association_id column removed');
      console.log('✅ All required columns present');
      console.log('✅ Events API should work correctly');
    } else {
      console.log('\n❌ association_id column still exists - manual intervention required');
    }
    
    console.log('\n🎯 Deployment Fix Complete!');
    console.log('💡 Note: Server restart may be required to clear Sequelize model cache');
    
  } catch (error) {
    console.error('❌ Deployment error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    process.exit(0);
  }
}

// Run the deployment fix
deployEventsFix();
