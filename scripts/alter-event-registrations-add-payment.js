const { sequelize } = require('../config/database');

async function alterEventRegistrations() {
  try {
    console.log('🚀 Altering event_registrations: add payment and attendance fields...');

    await sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='event_registrations' AND column_name='payment_status'
        ) THEN
          ALTER TABLE event_registrations 
            ADD COLUMN payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
            ADD COLUMN amount_paid NUMERIC(10,2),
            ADD COLUMN payment_order_id VARCHAR(100),
            ADD COLUMN payment_id VARCHAR(100),
            ADD COLUMN attended_at TIMESTAMPTZ;
        END IF;
      END $$;
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_event_registrations_payment_status 
      ON event_registrations (payment_status);
    `);

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_event_registrations_status 
      ON event_registrations (status);
    `);

    console.log('✅ event_registrations altered successfully');
  } catch (error) {
    console.error('❌ Error altering event_registrations:', error);
    throw error;
  }
}

alterEventRegistrations()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));


