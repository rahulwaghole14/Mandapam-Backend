const { sequelize } = require('../config/database');

const createRefreshTokensTable = async () => {
  try {
    console.log('🔄 Creating refresh_tokens table...');
    
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        token TEXT NOT NULL UNIQUE,
        member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
        device_info JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        last_used_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('✅ refresh_tokens table created successfully');
    
    // Create indexes
    console.log('📊 Creating indexes...');
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_member_id 
      ON refresh_tokens(member_id);
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token 
      ON refresh_tokens(token);
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at 
      ON refresh_tokens(expires_at);
    `);
    
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_is_revoked 
      ON refresh_tokens(is_revoked);
    `);
    
    console.log('✅ Indexes created successfully');
    
    // Add trigger for updated_at
    await sequelize.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    
    await sequelize.query(`
      DROP TRIGGER IF EXISTS update_refresh_tokens_updated_at ON refresh_tokens;
      CREATE TRIGGER update_refresh_tokens_updated_at
        BEFORE UPDATE ON refresh_tokens
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
    
    console.log('✅ Triggers created successfully');
    
    console.log('🎉 Refresh tokens table setup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error creating refresh_tokens table:', error);
    throw error;
  }
};

// Run the migration
createRefreshTokensTable()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
