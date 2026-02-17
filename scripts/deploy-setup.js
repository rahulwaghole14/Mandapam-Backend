const { sequelize, testConnection, syncDatabase } = require('../config/database');

async function setupProductionDatabase() {
  try {
    console.log('🚀 Setting up production database...');
    
    // Test connection
    console.log('🔍 Testing database connection...');
    const connected = await testConnection();
    
    if (!connected) {
      console.error('❌ Database connection failed');
      process.exit(1);
    }
    
    // Sync database (create tables)
    console.log('📊 Creating database tables...');
    const synced = await syncDatabase();
    
    if (!synced) {
      console.error('❌ Database sync failed');
      process.exit(1);
    }
    
    console.log('✅ Production database setup complete!');
    console.log('🎉 Your app is ready to serve requests!');
    
  } catch (error) {
    console.error('❌ Setup error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

// Run setup if this script is executed directly
if (require.main === module) {
  setupProductionDatabase();
}

module.exports = setupProductionDatabase;
