require('dotenv').config();
const { Event } = require('./models');
const fs = require('fs');
const path = require('path');

const UPLOADS_BASE_DIR = path.join(process.cwd(), 'uploads');

async function checkAndFixEventImages() {
  try {
    console.log('🔍 Checking event images...\n');

    const events = await Event.findAll({
      where: { image: { [require('sequelize').Op.ne]: null } },
      attributes: ['id', 'title', 'image']
    });

    console.log(`Found ${events.length} events with images\n`);

    let fixed = 0;
    let notFound = 0;

    for (const event of events) {
      const filename = event.image;
      console.log(`Event ID ${event.id}: ${event.title}`);
      console.log(`  Image filename: ${filename}`);

      // Check if filename contains a path
      const pathParts = filename.split('/');
      let actualFilename = filename;
      let foundPath = null;

      if (pathParts.length > 1) {
        actualFilename = pathParts[pathParts.length - 1];
        console.log(`  Detected path in filename, extracting: ${actualFilename}`);
      }

      // Check possible locations
      const possiblePaths = [
        path.join(UPLOADS_BASE_DIR, 'event-images', actualFilename),
        path.join(UPLOADS_BASE_DIR, 'event-images', filename),
        path.join(UPLOADS_BASE_DIR, filename),
        path.join(UPLOADS_BASE_DIR, ...pathParts)
      ];

      for (const filePath of possiblePaths) {
        if (fs.existsSync(filePath)) {
          foundPath = filePath;
          console.log(`  ✅ Found at: ${filePath}`);
          
          // If filename in DB has path but file is in event-images, update DB
          if (pathParts.length > 1 && filePath.includes('event-images')) {
            await event.update({ image: actualFilename });
            console.log(`  ✅ Updated database: ${filename} → ${actualFilename}`);
            fixed++;
          }
          break;
        }
      }

      if (!foundPath) {
        console.log(`  ❌ File not found in any location`);
        notFound++;
      }

      console.log('');
    }

    console.log('\n📊 Summary:');
    console.log(`  Total events with images: ${events.length}`);
    console.log(`  Fixed: ${fixed}`);
    console.log(`  Not found: ${notFound}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAndFixEventImages();

