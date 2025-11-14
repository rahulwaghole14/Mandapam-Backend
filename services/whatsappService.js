const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const DEVICE_UID = process.env.WHATSAPP_DEVICE_UID || 'a8bec8c820614d8ba084a55429716a78';
const DEVICE_NAME = process.env.WHATSAPP_DEVICE_NAME || 'Mandapam';
const COUNTRY_CODE = '91';

const WHATSAPP_MESSAGE_TEMPLATE = `
🙏 MANDAPAM 2026 – कोल्हापूर मध्ये आपले हार्दिक स्वागत! 🎉

आपण आता MANDAPAM Association चे अधिकृत सदस्य झाला आहात. 🎊

आपला Visitor Pass खाली जोडलेला आहे. 🎫

📞 कार्यक्रमाची सविस्तर माहिती, एक्झिबिटर्स माहिती, वेळापत्रक आणि खास ऑफर्स पाहण्यासाठी
MANDAPAM App डाउनलोड करा 👇

📱 Android वापरकर्त्यांसाठी:
👉 https://play.google.com/store/apps/details?id=com.mandapam.expo

🍎 iOS वापरकर्त्यांसाठी:
👉 लवकरच येत आहे

🔑 आपल्या मोबाईल क्रमांकाने लॉगिन करून अँपमध्ये प्रवेश करा.

आपल्या सहभागाबद्दल मनःपूर्वक धन्यवाद!

— MANDAPAM टीम
`.trim();

/**
 * Format phone number to 91XXXXXXXXXX
 */
function formatPhoneNumber(value) {
  const digits = (value || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 10) return `${COUNTRY_CODE}${digits}`;
  if (digits.length === 12 && digits.startsWith(COUNTRY_CODE)) return digits;
  if (digits.length > 10) return `${COUNTRY_CODE}${digits.slice(-10)}`;
  return '';
}

/**
 * Build WhatsApp message with member name
 */
function buildMessage(memberName) {
  const greetingName = memberName ? `प्रिय ${memberName},\n\n` : '';
  return `${greetingName}${WHATSAPP_MESSAGE_TEMPLATE}`;
}

/**
 * Send PDF file via WhatsApp
 * @param {string} phoneNumber - Phone number (will be formatted to 91XXXXXXXXXX)
 * @param {string} pdfFilePath - Path to PDF file
 * @param {string} memberName - Member name for personalized message
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
async function sendPdfViaWhatsApp(phoneNumber, pdfFilePath, memberName = '') {
  try {
    console.log(`[WhatsApp Service] sendPdfViaWhatsApp called`);
    console.log(`[WhatsApp Service] Phone: ${phoneNumber}, File: ${pdfFilePath}, Name: ${memberName}`);
    console.log(`[WhatsApp Service] DEVICE_UID: ${DEVICE_UID}, DEVICE_NAME: ${DEVICE_NAME}`);
    
    const formattedPhone = formatPhoneNumber(phoneNumber);
    console.log(`[WhatsApp Service] Formatted phone: ${formattedPhone}`);
    
    if (!formattedPhone) {
      console.error(`[WhatsApp Service] ❌ Invalid phone number format: ${phoneNumber}`);
      return {
        success: false,
        error: 'Invalid phone number format'
      };
    }

    if (!pdfFilePath || !fs.existsSync(pdfFilePath)) {
      console.error(`[WhatsApp Service] ❌ PDF file not found: ${pdfFilePath}`);
      console.error(`[WhatsApp Service] File exists check: ${fs.existsSync(pdfFilePath)}`);
      return {
        success: false,
        error: 'PDF file not found'
      };
    }

    const fileStats = fs.statSync(pdfFilePath);
    console.log(`[WhatsApp Service] PDF file size: ${fileStats.size} bytes (${(fileStats.size / 1024 / 1024).toFixed(2)} MB)`);

    const message = buildMessage(memberName);
    console.log(`[WhatsApp Service] Message length: ${message.length} characters`);

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('file', fs.createReadStream(pdfFilePath));
    formData.append('phone', formattedPhone);
    formData.append('message', message);

    const apiUrl = `https://messagesapi.co.in/chat/sendMessageFile/${DEVICE_UID}/${encodeURIComponent(DEVICE_NAME)}`;
    console.log(`[WhatsApp Service] Sending to API: ${apiUrl}`);

    // Send via WhatsApp API
    const response = await axios.post(
      apiUrl,
      formData,
      {
        headers: {
          ...formData.getHeaders()
        },
        timeout: 30000 // 30 seconds timeout
      }
    );

    console.log(`[WhatsApp Service] API Response status: ${response.status}`);
    console.log(`[WhatsApp Service] API Response data:`, JSON.stringify(response.data).substring(0, 200));

    if (response.status === 200) {
      console.log(`[WhatsApp Service] ✅ Successfully sent to ${formattedPhone}`);
      return {
        success: true,
        message: 'PDF sent via WhatsApp successfully'
      };
    } else {
      console.error(`[WhatsApp Service] ❌ API returned status ${response.status}`);
      return {
        success: false,
        error: `WhatsApp API returned status ${response.status}`
      };
    }
  } catch (error) {
    console.error(`[WhatsApp Service] ❌ Exception caught:`, error.message);
    if (error.response) {
      console.error(`[WhatsApp Service] Response status: ${error.response.status}`);
      console.error(`[WhatsApp Service] Response data:`, JSON.stringify(error.response.data));
    }
    if (error.request) {
      console.error(`[WhatsApp Service] Request made but no response received`);
    }
    console.error(`[WhatsApp Service] Full error:`, error);
    
    return {
      success: false,
      error: error.response?.data || error.message || 'Failed to send PDF via WhatsApp'
    };
  }
}

/**
 * Send PDF from base64 string via WhatsApp (for temporary files)
 * @param {string} phoneNumber - Phone number (will be formatted to 91XXXXXXXXXX)
 * @param {string} pdfBase64 - PDF as base64 string
 * @param {string} fileName - PDF file name
 * @param {string} memberName - Member name for personalized message
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
async function sendPdfBase64ViaWhatsApp(phoneNumber, pdfBase64, fileName, memberName = '') {
  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    if (!formattedPhone) {
      return {
        success: false,
        error: 'Invalid phone number format'
      };
    }

    if (!pdfBase64 || pdfBase64.length < 100) {
      return {
        success: false,
        error: 'Invalid or incomplete PDF data'
      };
    }

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    const message = buildMessage(memberName);

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('file', pdfBuffer, {
      filename: fileName || 'visitor-pass.pdf',
      contentType: 'application/pdf'
    });
    formData.append('phone', formattedPhone);
    formData.append('message', message);

    // Send via WhatsApp API
    const response = await axios.post(
      `https://messagesapi.co.in/chat/sendMessageFile/${DEVICE_UID}/${encodeURIComponent(DEVICE_NAME)}`,
      formData,
      {
        headers: {
          ...formData.getHeaders()
        },
        timeout: 30000 // 30 seconds timeout
      }
    );

    if (response.status === 200) {
      return {
        success: true,
        message: 'PDF sent via WhatsApp successfully'
      };
    } else {
      return {
        success: false,
        error: `WhatsApp API returned status ${response.status}`
      };
    }
  } catch (error) {
    console.error('WhatsApp service error:', error);
    return {
      success: false,
      error: error.response?.data || error.message || 'Failed to send PDF via WhatsApp'
    };
  }
}

module.exports = {
  sendPdfViaWhatsApp,
  sendPdfBase64ViaWhatsApp,
  formatPhoneNumber,
  buildMessage
};
