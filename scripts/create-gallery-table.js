const { sequelize, Gallery } = require('../models');

async function createGalleryTable() {
  try {
    console.log('Creating gallery table...');
    
    // Sync the Gallery model to create the table
    await Gallery.sync({ force: false }); // Set to true to drop and recreate
    
    console.log('✅ Gallery table created successfully!');
    
    // Test the table by creating a sample record (optional)
    console.log('Testing gallery table...');
    
    // You can add a test record here if needed
    // const testGallery = await Gallery.create({
    //   entityType: 'event',
    //   entityId: 1,
    //   filename: 'test-image.jpg',
    //   originalName: 'test-image.jpg',
    //   caption: 'Test image',
    //   uploadedBy: 1
    // });
    // console.log('✅ Test record created:', testGallery.id);
    
  } catch (error) {
    console.error('❌ Error creating gallery table:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the migration
createGalleryTable();
