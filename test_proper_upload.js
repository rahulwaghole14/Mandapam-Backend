const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testProperUpload() {
  try {
    console.log('Testing gallery upload with proper form-data library...');
    
    if (!fs.existsSync('test.png')) {
      console.log('No test.png found.');
      return;
    }
    
    // Create form data using the proper library
    const form = new FormData();
    
    // Add image file
    form.append('images', fs.createReadStream('test.png'));
    
    // Add captions as array
    form.append('captions', 'Proper Test Caption 1');
    form.append('captions', 'Proper Test Caption 2');
    
    // Add alt texts as array
    form.append('altTexts', 'Proper Alt Text 1');
    form.append('altTexts', 'Proper Alt Text 2');
    
    console.log('Form data prepared with proper library');
    
    // Make the request
    const response = await axios.post('http://localhost:5000/api/gallery/event/1', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBtYW5kYXAuY29tIiwibmFtZSI6IkFkbWluIFVzZXIiLCJyb2xlIjoiYWRtaW4iLCJkaXN0cmljdCI6IkRlZmF1bHQgRGlzdHJpY3QiLCJzdGF0ZSI6IkRlZmF1bHQgU3RhdGUiLCJwaG9uZSI6IjEyMzQ1Njc4OTAiLCJpc0FjdGl2ZSI6dHJ1ZSwiaWF0IjoxNzU4MDg1OTk1LCJleHAiOjE3NTgxNzIzOTV9.k5Oz0wllL3XZXmdKUEe8vafG7RkOCvUOH3PkEPMtUMs'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.images) {
      console.log('\n=== CAPTION ANALYSIS ===');
      response.data.images.forEach((image, index) => {
        console.log(`Image ${index + 1}:`);
        console.log(`  - Caption: "${image.caption}"`);
        console.log(`  - Alt Text: "${image.altText}"`);
        console.log(`  - Caption is null: ${image.caption === null}`);
        console.log(`  - Caption is undefined: ${image.caption === undefined}`);
        console.log(`  - Caption type: ${typeof image.caption}`);
      });
    }
    
  } catch (error) {
    console.error('Test failed:', error.response ? error.response.data : error.message);
  }
}

// Also test with single caption
async function testSingleCaption() {
  try {
    console.log('\n=== TESTING SINGLE CAPTION ===');
    
    if (!fs.existsSync('test.png')) {
      console.log('No test.png found.');
      return;
    }
    
    const form = new FormData();
    form.append('images', fs.createReadStream('test.png'));
    form.append('captions', 'Single Caption Test');
    form.append('altTexts', 'Single Alt Text Test');
    
    const response = await axios.post('http://localhost:5000/api/gallery/event/1', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwiZW1haWwiOiJhZG1pbkBtYW5kYXAuY29tIiwibmFtZSI6IkFkbWluIFVzZXIiLCJyb2xlIjoiYWRtaW4iLCJkaXN0cmljdCI6IkRlZmF1bHQgRGlzdHJpY3QiLCJzdGF0ZSI6IkRlZmF1bHQgU3RhdGUiLCJwaG9uZSI6IjEyMzQ1Njc4OTAiLCJpc0FjdGl2ZSI6dHJ1ZSwiaWF0IjoxNzU4MDg1OTk1LCJleHAiOjE3NTgxNzIzOTV9.k5Oz0wllL3XZXmdKUEe8vafG7RkOCvUOH3PkEPMtUMs'
      }
    });
    
    console.log('Single caption response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.images) {
      response.data.images.forEach((image, index) => {
        console.log(`Single Caption Image ${index + 1}:`);
        console.log(`  - Caption: "${image.caption}"`);
        console.log(`  - Alt Text: "${image.altText}"`);
      });
    }
    
  } catch (error) {
    console.error('Single caption test failed:', error.response ? error.response.data : error.message);
  }
}

// Run both tests
async function runTests() {
  await testProperUpload();
  await testSingleCaption();
}

runTests();
