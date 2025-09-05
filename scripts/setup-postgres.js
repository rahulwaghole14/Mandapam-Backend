const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const setupPostgreSQL = async () => {
  const client = new Client({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'password',
    database: 'postgres' // Connect to default postgres database first
  });

  try {
    console.log('🔌 Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Check if database exists
    const dbName = process.env.POSTGRES_DB || 'mandap_db';
    const result = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );

    if (result.rows.length === 0) {
      console.log(`📊 Creating database: ${dbName}`);
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`✅ Database '${dbName}' created successfully`);
    } else {
      console.log(`✅ Database '${dbName}' already exists`);
    }

    // Close connection to default database
    await client.end();

    // Test connection to the new database
    const testClient = new Client({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'password',
      database: dbName
    });

    await testClient.connect();
    console.log(`✅ Successfully connected to database '${dbName}'`);
    await testClient.end();

    console.log('\n🎉 PostgreSQL setup completed!');
    console.log('\n📋 Next steps:');
    console.log('1. Update your .env file with PostgreSQL credentials');
    console.log('2. Run: node scripts/migrate-to-postgres.js');
    console.log('3. Test the application: npm start');

  } catch (error) {
    console.error('❌ PostgreSQL setup failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure PostgreSQL is installed and running');
    console.log('2. Check your connection credentials');
    console.log('3. Ensure PostgreSQL service is started');
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 PostgreSQL is not running. Start it with:');
      console.log('   Windows: net start postgresql-x64-14');
      console.log('   macOS: brew services start postgresql');
      console.log('   Linux: sudo systemctl start postgresql');
    }
  }
};

// Run setup if this file is executed directly
if (require.main === module) {
  setupPostgreSQL();
}

module.exports = { setupPostgreSQL };
