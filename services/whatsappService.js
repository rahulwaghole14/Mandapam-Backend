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
 * Send PDF via WhatsApp (supports file path, buffer, or stream)
 * @param {string} phoneNumber - Phone number (will be formatted to 91XXXXXXXXXX)
 * @param {string|Buffer|Stream} pdfSource - Path to PDF file, PDF buffer, or PDF stream
 * @param {string} memberName - Member name for personalized message
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
async function sendPdfViaWhatsApp(phoneNumber, pdfSource, memberName = '') {
  try {
    console.log(`[WhatsApp Service] sendPdfViaWhatsApp called`);
    console.log(`[WhatsApp Service] Phone: ${phoneNumber}, Source type: ${typeof pdfSource}, Name: ${memberName}`);
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

    const message = buildMessage(memberName);
    console.log(`[WhatsApp Service] Message length: ${message.length} characters`);

    // Create FormData for file upload
    const formData = new FormData();
    
    // Handle different PDF source types
    if (typeof pdfSource === 'string') {
      // File path (legacy support)
      if (!fs.existsSync(pdfSource)) {
        console.error(`[WhatsApp Service] ❌ PDF file not found: ${pdfSource}`);
        return {
          success: false,
          error: 'PDF file not found'
        };
      }
      const fileStats = fs.statSync(pdfSource);
      console.log(`[WhatsApp Service] PDF file size: ${fileStats.size} bytes (${(fileStats.size / 1024 / 1024).toFixed(2)} MB)`);
      formData.append('file', fs.createReadStream(pdfSource));
    } else if (Buffer.isBuffer(pdfSource)) {
      // Buffer (preferred - no temp files)
      console.log(`[WhatsApp Service] PDF buffer size: ${pdfSource.length} bytes (${(pdfSource.length / 1024 / 1024).toFixed(2)} MB)`);
      formData.append('file', pdfSource, {
        filename: 'visitor-pass.pdf',
        contentType: 'application/pdf'
      });
    } else if (pdfSource && typeof pdfSource.pipe === 'function') {
      // Stream (preferred - most memory efficient)
      console.log(`[WhatsApp Service] PDF stream detected`);
      formData.append('file', pdfSource, {
        filename: 'visitor-pass.pdf',
        contentType: 'application/pdf'
      });
    } else {
      console.error(`[WhatsApp Service] ❌ Invalid PDF source type: ${typeof pdfSource}`);
      return {
        success: false,
        error: 'Invalid PDF source. Expected file path, buffer, or stream.'
      };
    }
    
    formData.append('phone', formattedPhone);
    formData.append('message', message);

    const apiUrl = `https://messagesapi.co.in/chat/sendMessageFile/${DEVICE_UID}/${encodeURIComponent(DEVICE_NAME)}`;
    console.log(`[WhatsApp Service] Sending to API: ${apiUrl}`);

    // Send via WhatsApp API (no timeout - async, can take as long as needed)
    const sendStartTime = Date.now();
    console.log(`[WhatsApp Service] 📤 Sending to API at ${new Date().toISOString()}`);
    
    const response = await axios.post(
      apiUrl,
      formData,
      {
        headers: {
          ...formData.getHeaders()
        },
        timeout: 0 // No timeout - can take as long as needed (async)
      }
    );
    
    const sendEndTime = Date.now();
    const sendDuration = sendEndTime - sendStartTime;
    console.log(`[WhatsApp Service] ⏱️ API call completed in ${sendDuration}ms at ${new Date().toISOString()}`);

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
    // Detailed error logging for debugging
    console.error(`[WhatsApp Service] ❌ EXCEPTION CAUGHT`);
    console.error(`[WhatsApp Service] Error Type: ${error.name || 'Unknown'}`);
    console.error(`[WhatsApp Service] Error Message: ${error.message || 'No message'}`);
    console.error(`[WhatsApp Service] Error Code: ${error.code || 'No code'}`);
    console.error(`[WhatsApp Service] Phone Number: ${phoneNumber} (formatted: ${formattedPhone})`);
    console.error(`[WhatsApp Service] PDF File Path: ${pdfFilePath}`);
    console.error(`[WhatsApp Service] Member Name: ${memberName || 'N/A'}`);
    console.error(`[WhatsApp Service] DEVICE_UID: ${DEVICE_UID}`);
    console.error(`[WhatsApp Service] DEVICE_NAME: ${DEVICE_NAME}`);
    
    if (error.response) {
      console.error(`[WhatsApp Service] ⚠️ API RESPONSE ERROR`);
      console.error(`[WhatsApp Service] Response Status: ${error.response.status}`);
      console.error(`[WhatsApp Service] Response Status Text: ${error.response.statusText || 'N/A'}`);
      console.error(`[WhatsApp Service] Response Headers:`, JSON.stringify(error.response.headers || {}));
      console.error(`[WhatsApp Service] Response Data:`, JSON.stringify(error.response.data || {}));
    } else if (error.request) {
      console.error(`[WhatsApp Service] ⚠️ NO RESPONSE FROM API`);
      console.error(`[WhatsApp Service] Request made but no response received`);
      console.error(`[WhatsApp Service] Request Config:`, {
        url: error.config?.url,
        method: error.config?.method,
        timeout: error.config?.timeout
      });
    } else {
      console.error(`[WhatsApp Service] ⚠️ REQUEST SETUP ERROR`);
      console.error(`[WhatsApp Service] Error occurred before request was sent`);
    }
    
    if (error.stack) {
      console.error(`[WhatsApp Service] Stack Trace:`, error.stack);
    }
    
    // Build detailed error message
    let errorMessage = 'Failed to send PDF via WhatsApp';
    if (error.response?.data) {
      if (typeof error.response.data === 'string') {
        errorMessage = error.response.data;
      } else if (error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.response.data.error) {
        errorMessage = error.response.data.error;
      } else {
        errorMessage = JSON.stringify(error.response.data);
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    // Add context to error message
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      errorMessage = `WhatsApp API timeout: ${errorMessage}`;
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      errorMessage = `WhatsApp API connection failed: ${errorMessage}`;
    } else if (error.response?.status) {
      errorMessage = `WhatsApp API error (${error.response.status}): ${errorMessage}`;
    }
    
    return {
      success: false,
      error: errorMessage,
      errorCode: error.code,
      errorStatus: error.response?.status,
      errorDetails: process.env.NODE_ENV === 'development' ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      } : undefined
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
        timeout: 0 // No timeout - can take as long as needed (async)
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
    // Detailed error logging for base64 sending
    console.error(`[WhatsApp Service] ❌ EXCEPTION CAUGHT (Base64)`);
    console.error(`[WhatsApp Service] Error Type: ${error.name || 'Unknown'}`);
    console.error(`[WhatsApp Service] Error Message: ${error.message || 'No message'}`);
    console.error(`[WhatsApp Service] Error Code: ${error.code || 'No code'}`);
    console.error(`[WhatsApp Service] Phone Number: ${phoneNumber} (formatted: ${formattedPhone})`);
    console.error(`[WhatsApp Service] File Name: ${fileName || 'N/A'}`);
    console.error(`[WhatsApp Service] PDF Base64 Length: ${pdfBase64?.length || 0}`);
    console.error(`[WhatsApp Service] Member Name: ${memberName || 'N/A'}`);
    
    if (error.response) {
      console.error(`[WhatsApp Service] ⚠️ API RESPONSE ERROR (Base64)`);
      console.error(`[WhatsApp Service] Response Status: ${error.response.status}`);
      console.error(`[WhatsApp Service] Response Data:`, JSON.stringify(error.response.data || {}));
    } else if (error.request) {
      console.error(`[WhatsApp Service] ⚠️ NO RESPONSE FROM API (Base64)`);
    }
    
    if (error.stack) {
      console.error(`[WhatsApp Service] Stack Trace (Base64):`, error.stack);
    }
    
    let errorMessage = 'Failed to send PDF via WhatsApp';
    if (error.response?.data) {
      if (typeof error.response.data === 'string') {
        errorMessage = error.response.data;
      } else if (error.response.data.message) {
        errorMessage = error.response.data.message;
      } else {
        errorMessage = JSON.stringify(error.response.data);
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage,
      errorCode: error.code,
      errorStatus: error.response?.status
    };
  }
}

module.exports = {
  sendPdfViaWhatsApp,
  sendPdfBase64ViaWhatsApp,
  formatPhoneNumber,
  buildMessage
};
