const { sequelize } = require('../config/database');

async function updateGalleryUploadedBy() {
  try {
    console.log('🔄 Updating gallery table - making uploaded_by nullable...');
    
    // Make uploaded_by column nullable
    await sequelize.query(`
      ALTER TABLE gallery 
      ALTER COLUMN uploaded_by DROP NOT NULL;
    `);
    
    console.log('✅ Gallery table updated successfully - uploaded_by is now nullable');
    
  } catch (error) {
    console.error('❌ Error updating gallery table:', error);
    throw error;
  }
}

// Run the migration
updateGalleryUploadedBy()
  .then(() => {
    console.log('🎉 Gallery table migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Gallery table migration failed:', error);
    process.exit(1);
  });
