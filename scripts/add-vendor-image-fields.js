const { sequelize } = require('../config/database');

const addVendorImageFields = async () => {
  try {
    console.log('🚀 Starting vendor image fields migration...');

    // Check if profileImage column exists
    const profileImageExists = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'vendors' 
      AND column_name = 'profile_image'
    `);

    if (profileImageExists[0].length === 0) {
      // Add profileImage column
      await sequelize.query(`
        ALTER TABLE vendors 
        ADD COLUMN profile_image VARCHAR(255)
      `);
      console.log('✅ Added profile_image column to vendors table');
    } else {
      console.log('✅ profile_image column already exists');
    }

    // Check if businessImages column exists
    const businessImagesExists = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'vendors' 
      AND column_name = 'business_images'
    `);

    if (businessImagesExists[0].length === 0) {
      // Add businessImages column
      await sequelize.query(`
        ALTER TABLE vendors 
        ADD COLUMN business_images TEXT[] DEFAULT '{}'
      `);
      console.log('✅ Added business_images column to vendors table');
    } else {
      console.log('✅ business_images column already exists');
    }

    console.log('🎉 Vendor image fields migration completed successfully!');

  } catch (error) {
    console.error('❌ Error during vendor image fields migration:', error);
    throw error;
  }
};

// Run migration if called directly
if (require.main === module) {
  addVendorImageFields()
    .then(() => {
      console.log('✅ Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    });
}

module.exports = addVendorImageFields;
