const { sequelize } = require('../config/database');

async function addBusinessCategoryColumn() {
  try {
    console.log('🚀 Adding business_category column to event_exhibitors table...');

    // First, create the enum type if it doesn't exist
    await sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE business_category_enum AS ENUM (
          'Flower Decoration',
          'Tent',
          'Lighting',
          'Sound',
          'Furniture',
          'Other'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add the column with default value
    await sequelize.query(`
      ALTER TABLE event_exhibitors 
      ADD COLUMN IF NOT EXISTS business_category business_category_enum 
      DEFAULT 'Other';
    `);

    console.log('✅ business_category column added successfully');
    console.log('📝 Default value set to: Other');
    console.log('📋 Available categories: Flower Decoration, Tent, Lighting, Sound, Furniture, Other');
  } catch (error) {
    console.error('❌ Error adding business_category column:', error);
    throw error;
  }
}

addBusinessCategoryColumn()
  .then(() => {
    console.log('✅ Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });

