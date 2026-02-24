const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const DEVICE_UID = process.env.WHATSAPP_DEVICE_UID || 'a8bec8c820614d8ba084a55429716a78';
const DEVICE_NAME = process.env.WHATSAPP_DEVICE_NAME || 'Mandapam';
const WHATSAPP_API_KEY = process.env.WHATSAPP_API_KEY || '';
const COUNTRY_CODE = '91';
const Logger = require('../utils/logger');

// Retry constants for OTP only
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

/**
 * Wait for a specified number of milliseconds
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
 * Send PDF via WhatsApp (supports file path, buffer, or stream) - ASYNC VERSION
 * @param {string} phoneNumber - Phone number (will be formatted to 91XXXXXXXXXX)
 * @param {string|Buffer|Stream} pdfSource - Path to PDF file, PDF buffer, or PDF stream
 * @param {string} memberName - Member name for personalized message
 * @param {Function} onProgress - Optional callback for progress updates
 * @returns {Promise<{success: boolean, message?: string, error?: string, isAsync?: boolean}>}
 */
async function sendPdfViaWhatsApp(phoneNumber, pdfSource, memberName = '', onProgress = null) {
  // Declare formattedPhone outside try block so it's available in catch
  let formattedPhone;

  try {
    console.log(`[WhatsApp Service] sendPdfViaWhatsApp called (ASYNC)`);
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

    // Start async background process
    console.log(`[WhatsApp Service] � Starting background WhatsApp send to ${formattedPhone}`);
    
    // Fire and forget - start background process
    sendPdfInBackground(formattedPhone, pdfSource, message, memberName, onProgress);
    
    // Return immediately with async response
    return {
      success: true,
      message: 'WhatsApp send started in background',
      isAsync: true
    };

  } catch (error) {
    // This only catches errors during setup, not during actual sending
    console.error(`[WhatsApp Service] ❌ SETUP ERROR`);
    console.error(`[WhatsApp Service] Error Type: ${error.name || 'Unknown'}`);
    console.error(`[WhatsApp Service] Error Message: ${error.message || 'No message'}`);
    
    return {
      success: false,
      error: `Failed to start WhatsApp send: ${error.message}`,
      isAsync: true
    };
  }
}

/**
 * Background WhatsApp sender - runs independently
 */
async function sendPdfInBackground(formattedPhone, pdfSource, message, memberName, onProgress) {
  try {
    if (onProgress) onProgress('preparing', 'Preparing WhatsApp send...');
    
    // Create FormData for file upload
    const formData = new FormData();

    // Handle different PDF source types
    if (typeof pdfSource === 'string') {
      if (!fs.existsSync(pdfSource)) {
        throw new Error('PDF file not found');
      }
      formData.append('file', fs.createReadStream(pdfSource));
    } else if (Buffer.isBuffer(pdfSource)) {
      formData.append('file', pdfSource, {
        filename: 'visitor-pass.pdf',
        contentType: 'application/pdf'
      });
    } else if (pdfSource && typeof pdfSource.pipe === 'function') {
      formData.append('file', pdfSource, {
        filename: 'visitor-pass.pdf',
        contentType: 'application/pdf'
      });
    }

    formData.append('phone', formattedPhone);
    formData.append('message', message);

    const apiUrl = `https://messagesapi.co.in/chat/sendMessageFile/${DEVICE_UID}/${encodeURIComponent(DEVICE_NAME)}`;
    
    if (onProgress) onProgress('sending', 'Sending via WhatsApp API...');
    
    const sendStartTime = Date.now();

    const response = await axios.post(
      apiUrl,
      formData,
      {
        headers: { ...formData.getHeaders() },
        timeout: 60000
      }
    );

    const sendDuration = Date.now() - sendStartTime;
    console.log(`[WhatsApp Service] ⏱️ Background send completed in ${sendDuration}ms`);

    // Check if response indicates success
    const responseData = response.data;
    const isSuccess = response.status === 200 && (
      (typeof responseData === 'object' && (responseData.success === true || responseData.status === 'success' || responseData.message?.toLowerCase().includes('success'))) ||
      (typeof responseData === 'string' && responseData.toLowerCase().includes('success'))
    );

    if (isSuccess) {
      Logger.info('WhatsApp Service: ✅ PDF sent via WhatsApp successfully (BACKGROUND)', {
        phone: formattedPhone,
        apiDuration: sendDuration,
        timestamp: new Date().toISOString()
      });
      
      if (onProgress) onProgress('success', 'PDF sent successfully via WhatsApp');
    } else {
      const errorMsg = typeof responseData === 'object' ? (responseData.error || responseData.message || 'Unknown error') : String(responseData);
      throw new Error(`API returned error response: ${errorMsg}`);
    }
  } catch (error) {
    // Log background error
    console.error(`[WhatsApp Service] ❌ BACKGROUND SEND ERROR`);
    console.error(`[WhatsApp Service] Error Type: ${error.name || 'Unknown'}`);
    console.error(`[WhatsApp Service] Error Message: ${error.message || 'No message'}`);
    console.error(`[WhatsApp Service] Error Code: ${error.code || 'No code'}`);
    console.error(`[WhatsApp Service] Phone: ${formattedPhone}`);
    console.error(`[WhatsApp Service] Member Name: ${memberName || 'N/A'}`);
    
    // Log to Logger for visibility
    Logger.error('WhatsApp Service: Background send failed', error, {
      phone: formattedPhone,
      memberName: memberName || 'N/A',
      errorType: error.name,
      errorCode: error.code,
      errorMessage: error.message,
      hasResponse: !!error.response,
      responseStatus: error.response?.status
    });
    
    if (onProgress) onProgress('error', `Failed to send: ${error.message}`);
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

    // Convert base64 to buffer and prepare message
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');
    const message = buildMessage(memberName);
    const apiUrl = `https://messagesapi.co.in/chat/sendMessageFile/${DEVICE_UID}/${encodeURIComponent(DEVICE_NAME)}`;

    console.log(`[WhatsApp Service] 📤 Sending PDF (Base64) to ${formattedPhone}`);
    const sendStartTime = Date.now();

    // Prepare form data
    const formData = new FormData();
    formData.append('file', pdfBuffer, {
      filename: fileName || 'visitor-pass.pdf',
      contentType: 'application/pdf'
    });
    formData.append('phone', formattedPhone);
    formData.append('message', message);

    const response = await axios.post(apiUrl, formData, {
      headers: { ...formData.getHeaders() },
      timeout: 60000
    });

    const sendDuration = Date.now() - sendStartTime;
    console.log(`[WhatsApp Service] ⏱️ Base64 send completed in ${sendDuration}ms`);

    const responseData = response.data;
    const isSuccess = response.status === 200 && (
      (typeof responseData === 'object' && (responseData.success === true || responseData.status === 'success' || responseData.message?.toLowerCase().includes('success'))) ||
      (typeof responseData === 'string' && responseData.toLowerCase().includes('success'))
    );

    if (isSuccess) {
      Logger.info('WhatsApp Service: ✅ PDF (Base64) sent via WhatsApp successfully', {
        phone: formattedPhone,
        fileName: fileName || 'visitor-pass.pdf',
        duration: sendDuration
      });
      return { success: true, message: 'PDF sent via WhatsApp successfully' };
    } else {
      const errorMsg = typeof responseData === 'object' ? (responseData.error || responseData.message || 'Unknown error') : String(responseData);
      throw new Error(`API returned error response: ${errorMsg}`);
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

    // Log to Logger for Render visibility
    Logger.error('WhatsApp Service: Exception sending PDF (Base64) via WhatsApp', error, {
      phone: safeFormattedPhone,
      originalPhone: phoneNumber,
      memberName: memberName || 'N/A',
      fileName: fileName || 'N/A',
      pdfBase64Length: pdfBase64?.length || 0,
      errorType: error.name,
      errorCode: error.code,
      errorMessage: error.message,
      hasResponse: !!error.response,
      responseStatus: error.response?.status
    });

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

    const apiUrl = `https://messagesapi.co.in/chat/sendMessage`;
    const requestBody = {
      id: DEVICE_UID,
      name: DEVICE_NAME,
      phone: formattedPhone,
      message: message
    };
    const headers = {
      'Content-Type': 'application/json',
      'Hello': 'Hello2'
    };
    if (WHATSAPP_API_KEY) {
      headers['x-api-key'] = WHATSAPP_API_KEY;
    }

    let lastError;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[WhatsApp Service] 📤 Attempt ${attempt}/${MAX_RETRIES} to send OTP to ${formattedPhone}`);
        const sendStartTime = Date.now();

        const response = await axios.post(apiUrl, requestBody, {
          headers,
          timeout: 45000 // 45s for OTP
        });

        const sendDuration = Date.now() - sendStartTime;
        console.log(`[WhatsApp Service] ⏱️ OTP Attempt ${attempt} completed in ${sendDuration}ms`);

        const responseData = response.data;
        const isSuccess = response.status === 200 && (
          (typeof responseData === 'object' && (responseData.success === true || responseData.status === 'success' || responseData.message?.toLowerCase().includes('success'))) ||
          (typeof responseData === 'string' && responseData.toLowerCase().includes('success'))
        );

        if (isSuccess) {
          console.log(`✅ WhatsApp OTP sent successfully to ${formattedPhone}`);
          Logger.info('WhatsApp Service: ✅ OTP sent successfully', {
            phone: formattedPhone,
            attempt,
            duration: sendDuration
          });
          return { success: true, message: 'OTP sent via WhatsApp successfully' };
        } else {
          const errorMsg = typeof responseData === 'object' ? (responseData.error || responseData.message || 'Unknown error') : String(responseData);
          throw new Error(`API returned error response: ${errorMsg}`);
        }
      } catch (err) {
        lastError = err;
        const isTransient = err.response && (err.response.status === 504 || err.response.status === 503 || err.response.status === 502);
        const isNetworkError = err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT' || err.message.includes('timeout');

        if ((isTransient || isNetworkError) && attempt < MAX_RETRIES) {
          console.warn(`[WhatsApp Service] ⚠️ OTP Attempt ${attempt} failed. Retrying...`);
          await wait(RETRY_DELAY_MS * attempt);
        } else {
          break;
        }
      }
    }

    throw lastError;
  } catch (error) {
    Logger.error('WhatsApp Service: Error sending OTP', error, {
      phone: phoneNumber,
      status: error.response?.status,
      data: error.response?.data
    });

    let errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to send OTP via WhatsApp';
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
