const { sequelize } = require('../config/database');

async function createEventRegistrationsTable() {
  try {
    console.log('🚀 Creating event_registrations table...');
    
    // Create the table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS event_registrations (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'cancelled', 'attended', 'no_show')),
        registered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log('✅ event_registrations table created successfully');
    
    // Create unique index to prevent duplicate registrations
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS unique_event_member_registration 
      ON event_registrations (event_id, member_id);
    `);
    
    console.log('✅ Unique index created successfully');
    
    // Create index for better query performance
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id 
      ON event_registrations (event_id);
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_event_registrations_member_id 
      ON event_registrations (member_id);
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_event_registrations_status 
      ON event_registrations (status);
    `);
    
    console.log('✅ Performance indexes created successfully');
    
    console.log('🎉 Event registrations table setup completed!');
    
  } catch (error) {
    console.error('❌ Error creating event_registrations table:', error);
    throw error;
  }
}

// Run the migration
createEventRegistrationsTable()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
