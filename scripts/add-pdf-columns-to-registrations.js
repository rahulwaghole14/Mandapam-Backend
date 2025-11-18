const { sequelize } = require('../config/database');

async function addPdfColumns() {
  try {
    console.log('🚀 Adding PDF columns to event_registrations table...');
    
    // Add pdf_path column
    await sequelize.query(`
      ALTER TABLE event_registrations
      ADD COLUMN IF NOT EXISTS pdf_path VARCHAR(500);
    `);
    
    console.log('✅ pdf_path column added successfully');
    
    // Add pdf_sent_at column
    await sequelize.query(`
      ALTER TABLE event_registrations
      ADD COLUMN IF NOT EXISTS pdf_sent_at TIMESTAMP WITH TIME ZONE;
    `);
    
    console.log('✅ pdf_sent_at column added successfully');
    
    console.log('🎉 PDF columns added successfully!');
    
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error adding PDF columns:', error);
    throw error;
  }
}

// Run the migration
addPdfColumns()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });









