const { sequelize } = require('../config/database');

async function addPaymentIdUniqueIndex() {
  try {
    console.log('🚀 Adding unique index on payment_id...');
    
    // Check if index already exists
    const [results] = await sequelize.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'event_registrations' 
      AND indexname = 'unique_payment_id';
    `);
    
    if (results.length > 0) {
      console.log('✅ Unique index on payment_id already exists');
      return;
    }
    
    // Create unique index on payment_id (only for non-null values)
    // This allows multiple NULL values but ensures each payment_id is unique
    await sequelize.query(`
      CREATE UNIQUE INDEX unique_payment_id 
      ON event_registrations (payment_id) 
      WHERE payment_id IS NOT NULL;
    `);
    
    console.log('✅ Unique index on payment_id created successfully');
    
    // Also add a regular index for faster lookups
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_event_registrations_payment_id 
      ON event_registrations (payment_id);
    `);
    
    console.log('✅ Index on payment_id created successfully');
    console.log('🎉 Payment ID indexing completed!');
    
  } catch (error) {
    console.error('❌ Error adding payment_id unique index:', error);
    throw error;
  }
}

// Run the migration
if (require.main === module) {
  addPaymentIdUniqueIndex()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addPaymentIdUniqueIndex;





