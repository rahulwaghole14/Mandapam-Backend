'use strict';

const { sequelize } = require('../config/database');

async function migrate() {
  try {
    await sequelize.authenticate();

    await sequelize.query(`
      ALTER TABLE event_registrations
      ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE NULL;
    `);

    process.stdout.write('✅ Migration applied: event_registrations.cancelled_at\n');
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) {
  migrate().catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exitCode = 1;
  });
}

module.exports = migrate;
