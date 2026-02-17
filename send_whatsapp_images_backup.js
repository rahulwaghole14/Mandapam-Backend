const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios = require('axios');
const { sequelize, Event, EventRegistration, Member } = require('./models');

// Configuration
const IMAGE_PATH = path.join(__dirname, '../WhatsApp Image 2025-12-19 at 14.59.35.jpeg');
const OUTPUT_FILE = path.join(__dirname, 'whatsapp_send_results.json');
const WHATSAPP_API_URL = 'https://messagesapi.co.in/chat/sendFile';
const DEVICE_UID = process.env.WHATSAPP_DEVICE_UID || 'ad7838b8e5b94b978757bb5ce9b634f9';
const DEVICE_NAME = process.env.WHATSAPP_DEVICE_NAME || 'OnePlus9';

// TEST MODE - Set to true to test with single number, false for all users
const TEST_MODE = true;
const TEST_PHONE_NUMBER = '919999999999'; // Replace with your actual phone number

// Results tracking
const results = {
  total: 0,
  success: 0,
  failed: 0,
  startTime: new Date(),
  endTime: null,
  details: []
};

// Format phone number to 91XXXXXXXXXX format
function formatPhoneNumber(phone) {
  if (!phone) return null;
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');
  // If starts with 0, remove it
  if (digits.startsWith('0')) {
    digits = digits.substring(1);
  }
  // If doesn't start with country code, add 91
  if (!digits.startsWith('91') && digits.length === 10) {
    digits = `91${digits}`;
  }
  return digits;
}

// Send image via WhatsApp
async function sendWhatsAppImage(phoneNumber, memberName) {
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(IMAGE_PATH));
    formData.append('phone', phoneNumber);
    
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${DEVICE_UID}/${DEVICE_NAME}`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
        },
        maxBodyLength: Infinity,
      }
    );

    // Check if the message was actually sent successfully
    const responseData = response.data;
    if (responseData.status === 'error' || 
        responseData.message?.includes('not connected') ||
        (responseData.deliveryReports && 
         responseData.deliveryReports[0]?.status === 'Error')) {
      return {
        success: false,
        message: 'WhatsApp device not connected or message failed',
        error: responseData.message || 'Unknown error',
        data: responseData
      };
    }

    // Check for successful delivery
    if (responseData.deliveryReports && 
        responseData.deliveryReports[0]?.status === 'Success') {
      return {
        success: true,
        message: 'Image sent and delivered successfully',
        data: responseData
      };
    }

    // If no clear success/failure, assume failed for safety
    return {
      success: false,
      message: 'Unclear delivery status',
      error: responseData,
      data: responseData
    };
  } catch (error) {
    return {
      success: false,
      message: error.message,
      error: error.response?.data || error
    };
  }
}

// Process all users
async function processUsers() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');
    
    // Get all registrations with member details
    const registrations = await EventRegistration.findAll({
      where: { eventId: 33 }, // Kolhapur event ID
      include: [
        {
          model: Member,
          as: 'member',
          attributes: ['id', 'name', 'phone', 'email']
        },
        {
          model: Event,
          as: 'event',
          attributes: ['id', 'title']
        }
      ]
    });

    console.log(`Found ${registrations.length} registrations for Kolhapur event`);

    // Process each registration
    for (const [index, reg] of registrations.entries()) {
      const member = reg.member;
      if (!member?.phone) {
        console.log(`Skipping registration ${reg.id} - No phone number`);
        continue;
      }

      const phoneNumber = formatPhoneNumber(member.phone);
      if (!phoneNumber) {
        console.log(`Skipping ${member.name} - Invalid phone number: ${member.phone}`);
        continue;
      }

      console.log(`[${index + 1}/${registrations.length}] Sending to ${member.name} (${phoneNumber})...`);
      
      const result = {
        registrationId: reg.id,
        memberId: member.id,
        memberName: member.name,
        phone: member.phone,
        formattedPhone: phoneNumber,
        timestamp: new Date().toISOString()
      };

      try {
        const sendResult = await sendWhatsAppImage(phoneNumber, member.name);
        if (sendResult.success) {
          result.status = 'success';
          results.success++;
        } else {
          result.status = 'failed';
          result.error = sendResult.message;
          results.failed++;
        }
        result.details = sendResult;
      } catch (error) {
        result.status = 'error';
        result.error = error.message;
        results.failed++;
      }

      results.details.push(result);
      results.total = registrations.length;
      
      // Save progress after each send
      saveResults();
      
      // Add delay to avoid rate limiting (1 second between sends)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Update end time and save final results
    results.endTime = new Date();
    saveResults();
    console.log('Processing complete!');
    console.log(`Success: ${results.success}, Failed: ${results.failed}, Total: ${results.total}`);

  } catch (error) {
    console.error('Error processing users:', error);
    results.endTime = new Date();
    saveResults();
  } finally {
    await sequelize.close();
  }
}

// Save results to file
function saveResults() {
  const data = {
    ...results,
    duration: results.endTime 
      ? `${(results.endTime - results.startTime) / 1000} seconds` 
      : 'In progress'
  };
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
  console.log('Progress saved to', OUTPUT_FILE);
}

// Start processing
processUsers().catch(console.error);
