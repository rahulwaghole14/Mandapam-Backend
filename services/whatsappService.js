const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const DEVICE_UID = process.env.WHATSAPP_DEVICE_UID || 'a8bec8c820614d8ba084a55429716a78';
const DEVICE_NAME = process.env.WHATSAPP_DEVICE_NAME || 'Mandapam';
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || '';
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
 * Ensures country code 91 is always present
 */
function formatPhoneNumber(value) {
  if (!value) return '';
  
  // Remove all non-digit characters
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  
  // If already 12 digits and starts with 91, return as is
  if (digits.length === 12 && digits.startsWith(COUNTRY_CODE)) {
    return digits;
  }
  
  // If 10 digits, add 91 prefix
  if (digits.length === 10) {
    return `${COUNTRY_CODE}${digits}`;
  }
  
  // If 11 digits and starts with 0, remove 0 and add 91
  if (digits.length === 11 && digits.startsWith('0')) {
    return `${COUNTRY_CODE}${digits.substring(1)}`;
  }
  
  // If more than 10 digits, take last 10 and add 91
  if (digits.length > 10) {
    return `${COUNTRY_CODE}${digits.slice(-10)}`;
  }
  
  // If less than 10 digits, it's invalid
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
  // Declare formattedPhone outside try block so it's available in catch
  let formattedPhone;
  
  try {
    console.log(`[WhatsApp Service] sendPdfViaWhatsApp called`);
    console.log(`[WhatsApp Service] Phone: ${phoneNumber}, Source type: ${typeof pdfSource}, Name: ${memberName}`);
    console.log(`[WhatsApp Service] DEVICE_UID: ${DEVICE_UID}, DEVICE_NAME: ${DEVICE_NAME}`);
    
    formattedPhone = formatPhoneNumber(phoneNumber);
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

    const Logger = require('../utils/logger');
    Logger.info('WhatsApp Service: API Response received', {
      status: response.status,
      statusText: response.statusText,
      responseData: typeof response.data === 'object' ? JSON.stringify(response.data).substring(0, 500) : String(response.data).substring(0, 500),
      phone: formattedPhone,
      memberName
    });

    // Check if response indicates success
    const responseData = response.data;
    const isSuccess = response.status === 200 && (
      (typeof responseData === 'object' && (responseData.success === true || responseData.status === 'success' || responseData.message?.toLowerCase().includes('success'))) ||
      (typeof responseData === 'string' && responseData.toLowerCase().includes('success'))
    );

    if (isSuccess) {
      // Log success with comprehensive details
      Logger.info('WhatsApp Service: ✅ PDF sent via WhatsApp successfully', {
        phone: formattedPhone,
        originalPhone: phoneNumber,
        memberName: memberName || 'N/A',
        responseStatus: response.status,
        apiDuration: sendDuration,
        pdfSize: typeof pdfSource === 'string' 
          ? (fs.existsSync(pdfSource) ? fs.statSync(pdfSource).size : 'unknown')
          : (Buffer.isBuffer(pdfSource) ? pdfSource.length : 'stream'),
        timestamp: new Date().toISOString()
      });
      console.log(`[WhatsApp Service] ✅ SUCCESS: PDF sent to ${formattedPhone} (${memberName || 'N/A'}) in ${sendDuration}ms`);
      return {
        success: true,
        message: 'PDF sent via WhatsApp successfully'
      };
    } else {
      // Even if status is 200, check if the response indicates failure
      const errorMsg = typeof responseData === 'object' 
        ? (responseData.error || responseData.message || 'Unknown error')
        : (typeof responseData === 'string' ? responseData : `WhatsApp API returned status ${response.status}`);
      
      Logger.error('WhatsApp Service: API returned error response', new Error(errorMsg), {
        phone: formattedPhone,
        status: response.status,
        responseData: typeof responseData === 'object' ? JSON.stringify(responseData) : String(responseData)
      });
      
      return {
        success: false,
        error: errorMsg
      };
    }
  } catch (error) {
    // Detailed error logging for debugging
    console.error(`[WhatsApp Service] ❌ EXCEPTION CAUGHT`);
    console.error(`[WhatsApp Service] Error Type: ${error.name || 'Unknown'}`);
    console.error(`[WhatsApp Service] Error Message: ${error.message || 'No message'}`);
    console.error(`[WhatsApp Service] Error Code: ${error.code || 'No code'}`);
    // Format phone if not already formatted (in case error occurred before formatting)
    const safeFormattedPhone = formattedPhone || formatPhoneNumber(phoneNumber);
    console.error(`[WhatsApp Service] Phone Number: ${phoneNumber} (formatted: ${safeFormattedPhone})`);
    // Fix: Use pdfSource instead of pdfFilePath, and handle different types
    const pdfSourceInfo = typeof pdfSource === 'string' 
      ? pdfSource 
      : (Buffer.isBuffer(pdfSource) ? `Buffer(${pdfSource.length} bytes)` : (pdfSource && typeof pdfSource.pipe === 'function' ? 'Stream' : 'Unknown'));
    console.error(`[WhatsApp Service] PDF Source: ${pdfSourceInfo}`);
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
  // Declare formattedPhone outside try block so it's available in catch
  let formattedPhone;
  
  try {
    formattedPhone = formatPhoneNumber(phoneNumber);
    
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
      // Log success for base64 sending
      const Logger = require('../utils/logger');
      Logger.info('WhatsApp Service: ✅ PDF (Base64) sent via WhatsApp successfully', {
        phone: formattedPhone,
        originalPhone: phoneNumber,
        memberName: memberName || 'N/A',
        fileName: fileName || 'visitor-pass.pdf',
        pdfBase64Length: pdfBase64?.length || 0,
        timestamp: new Date().toISOString()
      });
      console.log(`[WhatsApp Service] ✅ SUCCESS (Base64): PDF sent to ${formattedPhone} (${memberName || 'N/A'})`);
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
    // Format phone if not already formatted (in case error occurred before formatting)
    const safeFormattedPhone = formattedPhone || formatPhoneNumber(phoneNumber);
    console.error(`[WhatsApp Service] Phone Number: ${phoneNumber} (formatted: ${safeFormattedPhone})`);
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

/**
 * Send OTP via WhatsApp
 * @param {string} phoneNumber - Phone number (will be formatted to 91XXXXXXXXXX)
 * @param {string} otp - 6-digit OTP code
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
async function sendOTP(phoneNumber, otp) {
  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    if (!formattedPhone) {
      return {
        success: false,
        error: 'Invalid phone number format'
      };
    }

    if (!otp || otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      return {
        success: false,
        error: 'Invalid OTP format. Must be 6 digits.'
      };
    }

    // Build OTP message
    const message = `🔐 MANDAPAM Login OTP\n\nYour OTP is: ${otp}\n\nThis OTP is valid for 10 minutes.\n\nDo not share this OTP with anyone.\n\n— MANDAPAM Team`;

    console.log(`[WhatsApp Service] 📤 Sending OTP to ${formattedPhone} at ${new Date().toISOString()}`);
    console.log(`[WhatsApp Service] Original phone: ${phoneNumber}, Formatted phone: ${formattedPhone}`);

    // Use JSON format as per API documentation
    const sendStartTime = Date.now();
    const apiUrl = `https://messagesapi.co.in/chat/sendMessage`;
    console.log(`[WhatsApp Service] API URL: ${apiUrl}`);
    console.log(`[WhatsApp Service] Phone: ${formattedPhone}, Message length: ${message.length} chars`);
    
    // Prepare request body according to API documentation
    const requestBody = {
      id: DEVICE_UID,
      name: DEVICE_NAME,
      phone: formattedPhone,
      message: message
    };

    // Prepare headers according to API documentation
    const headers = {
      'Content-Type': 'application/json',
      'Hello': 'Hello2'
    };
    
    // Add API key if available
    if (WHATSAPP_API_KEY) {
      headers['x-api-key'] = WHATSAPP_API_KEY;
    }

    console.log(`[WhatsApp Service] Request body:`, JSON.stringify(requestBody));
    console.log(`[WhatsApp Service] Headers:`, JSON.stringify(headers));
    
    const response = await axios.post(
      apiUrl,
      requestBody,
      {
        headers: headers,
        timeout: 0 // No timeout - async, can take as long as needed
      }
    );

    const sendEndTime = Date.now();
    const sendDuration = sendEndTime - sendStartTime;
    console.log(`[WhatsApp Service] ⏱️ OTP API call completed in ${sendDuration}ms at ${new Date().toISOString()}`);

    // Check if response indicates success (similar to PDF sending logic)
    const responseData = response.data;
    const isSuccess = response.status === 200 && (
      (typeof responseData === 'object' && (responseData.success === true || responseData.status === 'success' || responseData.message?.toLowerCase().includes('success'))) ||
      (typeof responseData === 'string' && responseData.toLowerCase().includes('success'))
    );

    if (isSuccess) {
      console.log(`✅ WhatsApp OTP sent successfully to ${formattedPhone}`);
      return {
        success: true,
        message: 'OTP sent via WhatsApp successfully'
      };
    } else {
      // Even if status is 200, check if the response indicates failure
      const errorMsg = typeof responseData === 'object' 
        ? (responseData.error || responseData.message || 'Unknown error')
        : (typeof responseData === 'string' ? responseData : `WhatsApp API returned status ${response.status}`);
      
      console.error(`⚠️ WhatsApp OTP API returned error response: ${errorMsg}`);
      return {
        success: false,
        error: errorMsg
      };
    }
  } catch (error) {
    console.error(`[WhatsApp Service] ❌ Error sending OTP to ${phoneNumber}:`, error.message);
    
    let errorMessage = 'Failed to send OTP via WhatsApp';
    if (error.response?.data) {
      if (typeof error.response.data === 'string') {
        errorMessage = error.response.data;
      } else if (error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (error.response.data.error) {
        errorMessage = error.response.data.error;
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
  sendOTP,
  formatPhoneNumber,
  buildMessage
};
