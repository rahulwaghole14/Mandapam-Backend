const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false
});

async function createWhatsAppConfigTable() {
  try {
    console.log('🔄 Creating WhatsApp configuration table...');
    
    // Create the whatsapp_config table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_config (
        id SERIAL PRIMARY KEY,
        instance_id VARCHAR(255) NOT NULL,
        access_token VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log('✅ WhatsApp configuration table created successfully');
    
    // Create index for better performance
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_whatsapp_config_active 
      ON whatsapp_config(is_active) 
      WHERE is_active = true;
    `);
    
    console.log('✅ Index created for active configurations');
    
    // Insert a default inactive configuration
    await sequelize.query(`
      INSERT INTO whatsapp_config (instance_id, access_token, is_active, created_by)
      VALUES ('DEFAULT_INSTANCE', 'DEFAULT_TOKEN', false, 1)
      ON CONFLICT DO NOTHING;
    `);
    
    console.log('✅ Default configuration inserted');
    
  } catch (error) {
    console.error('❌ Error creating WhatsApp configuration table:', error);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Run the migration
createWhatsAppConfigTable()
  .then(() => {
    console.log('🎉 WhatsApp configuration table migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  });
