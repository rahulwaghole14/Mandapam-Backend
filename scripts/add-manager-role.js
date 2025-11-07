const { sequelize } = require('../config/database');

async function addManagerRole() {
  try {
    console.log('🚀 Adding "manager" role to users.role enum...');

    await sequelize.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_type t
          JOIN pg_enum e ON t.oid = e.enumtypid
          WHERE t.typname = 'enum_users_role'
            AND e.enumlabel = 'manager'
        ) THEN
          ALTER TYPE "enum_users_role" ADD VALUE 'manager';
        END IF;
      END $$;
    `);

    console.log('✅ "manager" role added (or already present).');
  } catch (error) {
    console.error('❌ Failed to add manager role:', error);
    throw error;
  }
}

addManagerRole()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
