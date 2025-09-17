const { sequelize } = require('../models');

async function createNotificationTables() {
  try {
    console.log('Creating FCM tokens table...');
    
    // Create FCM tokens table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS fcm_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(255) NOT NULL UNIQUE,
        device_type VARCHAR(10) NOT NULL CHECK (device_type IN ('android', 'ios')),
        is_active BOOLEAN NOT NULL DEFAULT true,
        last_used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Creating notification logs table...');
    
    // Create notification logs table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS notification_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('event', 'app_update')),
        event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
        sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
        status VARCHAR(10) NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed')),
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log('Creating indexes...');
    
    // Create indexes for FCM tokens
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_fcm_tokens_token ON fcm_tokens(token);
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_fcm_tokens_is_active ON fcm_tokens(is_active);
    `);

    // Create indexes for notification logs
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(type);
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
    `);

    console.log('✅ Notification tables created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating notification tables:', error);
    throw error;
  }
}

// Run the migration
createNotificationTables()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
