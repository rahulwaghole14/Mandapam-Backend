const { sequelize } = require('../config/database');

const fixBODAssociationId = async () => {
  try {
    console.log('🔧 Fixing BOD association_id column to allow NULL values...');

    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    // Check current column definition
    const [results] = await sequelize.query(`
      SELECT column_name, is_nullable, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'board_of_directors' 
      AND column_name = 'association_id'
    `);

    if (results.length > 0) {
      const column = results[0];
      console.log('📊 Current association_id column definition:');
      console.log(`- Column: ${column.column_name}`);
      console.log(`- Nullable: ${column.is_nullable}`);
      console.log(`- Data Type: ${column.data_type}`);
      console.log(`- Default: ${column.column_default}`);

      if (column.is_nullable === 'NO') {
        console.log('🔧 Column is currently NOT NULL, updating to allow NULL...');
        
        // Alter the column to allow NULL
        await sequelize.query(`
          ALTER TABLE board_of_directors 
          ALTER COLUMN association_id DROP NOT NULL
        `);
        
        console.log('✅ Successfully updated association_id column to allow NULL values');
      } else {
        console.log('✅ Column already allows NULL values');
      }
    } else {
      console.log('❌ association_id column not found in board_of_directors table');
    }

    // Verify the change
    const [verifyResults] = await sequelize.query(`
      SELECT column_name, is_nullable, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'board_of_directors' 
      AND column_name = 'association_id'
    `);

    if (verifyResults.length > 0) {
      const column = verifyResults[0];
      console.log('\n📊 Updated association_id column definition:');
      console.log(`- Column: ${column.column_name}`);
      console.log(`- Nullable: ${column.is_nullable}`);
      console.log(`- Data Type: ${column.data_type}`);
      console.log(`- Default: ${column.column_default}`);
    }

    console.log('\n🎉 BOD association_id column fix completed!');

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await sequelize.close();
    console.log('🔌 Database connection closed');
  }
};

// Run fix if this file is executed directly
if (require.main === module) {
  fixBODAssociationId();
}

module.exports = { fixBODAssociationId };
