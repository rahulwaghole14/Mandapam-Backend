require('dotenv').config();
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

async function testEventImageUpdate() {
  try {
    console.log('🧪 Testing Event Image Update\n');
    console.log(`Base URL: ${BASE_URL}\n`);

    // Step 1: Get an existing event with an image
    console.log('📋 Step 1: Getting existing events...');
    const eventsResponse = await axios.get(`${BASE_URL}/api/events`, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
      },
      params: {
        limit: 5
      }
    });

    if (eventsResponse.data.success && eventsResponse.data.events.length > 0) {
      const event = eventsResponse.data.events.find(e => e.image) || eventsResponse.data.events[0];
      console.log(`✅ Found event ID ${event.id}: ${event.title}`);
      console.log(`   Current image: ${event.image || 'None'}`);
      console.log(`   Current imageURL: ${event.imageURL || 'None'}\n`);

      // Step 2: Create a test image file
      console.log('📸 Step 2: Creating test image...');
      const testImagePath = path.join(__dirname, 'test-image.png');
      
      // Create a simple 1x1 PNG image (base64)
      const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      fs.writeFileSync(testImagePath, Buffer.from(pngBase64, 'base64'));
      console.log(`✅ Test image created: ${testImagePath}\n`);

      // Step 3: Update event with new image
      console.log('🔄 Step 3: Updating event with new image...');
      const formData = new FormData();
      formData.append('title', event.title);
      formData.append('description', event.description || 'Updated description');
      formData.append('image', fs.createReadStream(testImagePath));

      const updateResponse = await axios.put(
        `${BASE_URL}/api/events/${event.id}`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${ADMIN_TOKEN}`,
            ...formData.getHeaders()
          }
        }
      );

      if (updateResponse.data.success) {
        console.log('✅ Event updated successfully!');
        console.log('\n📊 Response:');
        console.log(`   Event ID: ${updateResponse.data.event.id}`);
        console.log(`   New image filename: ${updateResponse.data.event.image}`);
        console.log(`   New imageURL: ${updateResponse.data.event.imageURL}`);
        console.log(`   Uploaded file filename: ${updateResponse.data.uploadedFiles?.image?.filename}`);
        console.log(`   Uploaded file URL: ${updateResponse.data.uploadedFiles?.image?.url}`);

        // Step 4: Verify the image URL is accessible
        console.log('\n🔍 Step 4: Verifying image URL...');
        if (updateResponse.data.event.imageURL) {
          try {
            const imageResponse = await axios.get(updateResponse.data.event.imageURL, {
              responseType: 'arraybuffer',
              validateStatus: () => true // Don't throw on 404
            });
            
            if (imageResponse.status === 200) {
              console.log(`✅ Image URL is accessible (Status: ${imageResponse.status})`);
              console.log(`   Content-Type: ${imageResponse.headers['content-type']}`);
              console.log(`   Content-Length: ${imageResponse.headers['content-length']} bytes`);
            } else {
              console.log(`❌ Image URL returned status ${imageResponse.status}`);
              console.log(`   URL: ${updateResponse.data.event.imageURL}`);
            }
          } catch (error) {
            console.log(`❌ Error accessing image URL: ${error.message}`);
            console.log(`   URL: ${updateResponse.data.event.imageURL}`);
          }
        }

        // Step 5: Get event again to verify update persisted
        console.log('\n🔍 Step 5: Verifying update persisted...');
        const verifyResponse = await axios.get(`${BASE_URL}/api/events/${event.id}`, {
          headers: {
            'Authorization': `Bearer ${ADMIN_TOKEN}`
          }
        });

        if (verifyResponse.data.success) {
          const updatedEvent = verifyResponse.data.event;
          console.log(`✅ Event retrieved successfully`);
          console.log(`   Image filename: ${updatedEvent.image}`);
          console.log(`   Image URL: ${updatedEvent.imageURL}`);
          
          if (updatedEvent.image === updateResponse.data.event.image) {
            console.log('✅ Image filename matches!');
          } else {
            console.log('❌ Image filename mismatch!');
          }
        }

        // Cleanup
        fs.unlinkSync(testImagePath);
        console.log('\n🧹 Cleanup: Test image deleted');

      } else {
        console.log('❌ Event update failed:', updateResponse.data);
      }

    } else {
      console.log('❌ No events found');
    }

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run test
if (require.main === module) {
  if (!ADMIN_TOKEN) {
    console.error('❌ ADMIN_TOKEN environment variable is required');
    console.log('Usage: ADMIN_TOKEN=your_token node scripts/test_event_image_update.js');
    process.exit(1);
  }
  testEventImageUpdate();
}

module.exports = { testEventImageUpdate };

