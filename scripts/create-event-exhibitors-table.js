const { sequelize } = require('../config/database');

async function createEventExhibitorsTable() {
  try {
    console.log('🚀 Creating event_exhibitors table...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS event_exhibitors (
        id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        logo VARCHAR(255),
        description TEXT,
        phone VARCHAR(20),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_event_exhibitors_event_id ON event_exhibitors (event_id);
    `);

    console.log('✅ event_exhibitors table created successfully');
  } catch (error) {
    console.error('❌ Error creating event_exhibitors table:', error);
    throw error;
  }
}

createEventExhibitorsTable()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));


