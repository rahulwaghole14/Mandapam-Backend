const axios = require('axios');
const { WhatsAppConfig } = require('../models');

class WhatsAppService {
  constructor() {
    this.baseUrl = 'https://alldigimkt.org/api/send';
    this.isEnabled = false;
    this.currentConfig = null;
  }

  /**
   * Initialize the service with active configuration
   */
  async initialize() {
    try {
      this.currentConfig = await WhatsAppConfig.getActiveConfig();
      this.isEnabled = this.currentConfig && this.currentConfig.isActive;
      
      if (this.isEnabled) {
        console.log('✅ WhatsApp service initialized with active configuration');
      } else {
        console.log('⚠️ WhatsApp service initialized but no active configuration found');
      }
    } catch (error) {
      console.error('❌ Error initializing WhatsApp service:', error);
      this.isEnabled = false;
    }
  }

  /**
   * Format phone number to 91{10-digit} format
   * @param {string} phoneNumber - 10-digit phone number
   * @returns {string} - Formatted phone number
   */
  formatPhoneNumber(phoneNumber) {
    // Remove any non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // If it's already 12 digits (91 + 10 digits), return as is
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return cleaned;
    }
    
    // If it's 10 digits, add 91 prefix
    if (cleaned.length === 10) {
      return `91${cleaned}`;
    }
    
    // If it's 11 digits and starts with 0, remove 0 and add 91
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
      return `91${cleaned.substring(1)}`;
    }
    
    throw new Error(`Invalid phone number format: ${phoneNumber}`);
  }

  /**
   * Generate OTP message template
   * @param {string} otp - 6-digit OTP
   * @returns {string} - Formatted message
   */
  generateOTPMessage(otp) {
    return `🔐 Your Mandapam Association OTP is: ${otp}\n\nThis OTP is valid for 10 minutes. Do not share it with anyone.\n\nThank you for using Mandapam Association services!`;
  }

  /**
   * Send OTP via WhatsApp
   * @param {string} phoneNumber - 10-digit phone number
   * @param {string} otp - 6-digit OTP
   * @returns {Promise<Object>} - API response
   */
  async sendOTP(phoneNumber, otp) {
    if (!this.isEnabled || !this.currentConfig) {
      throw new Error('WhatsApp service is not configured or enabled');
    }

    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      const message = this.generateOTPMessage(otp);
      
      console.log(`📱 Sending WhatsApp OTP to ${formattedNumber}`);
      
      const response = await this.sendMessage(formattedNumber, message);
      
      console.log(`✅ WhatsApp OTP sent successfully to ${formattedNumber}`);
      return response;
      
    } catch (error) {
      console.error(`❌ Error sending WhatsApp OTP to ${phoneNumber}:`, error.message);
      throw error;
    }
  }

  /**
   * Send generic message via WhatsApp
   * @param {string} phoneNumber - Formatted phone number (91XXXXXXXXXX)
   * @param {string} message - Message to send
   * @returns {Promise<Object>} - API response
   */
  async sendMessage(phoneNumber, message) {
    if (!this.isEnabled || !this.currentConfig) {
      throw new Error('WhatsApp service is not configured or enabled');
    }

    try {
      const params = {
        number: phoneNumber,
        type: 'text',
        message: message,
        instance_id: this.currentConfig.instanceId,
        access_token: this.currentConfig.accessToken
      };

      console.log(`📤 Sending WhatsApp message to ${phoneNumber}`);
      console.log(`📝 Message: ${message.substring(0, 50)}...`);

      const response = await axios.get(this.baseUrl, { params });
      
      console.log(`✅ WhatsApp message sent successfully to ${phoneNumber}`);
      return {
        success: true,
        data: response.data,
        phoneNumber: phoneNumber,
        messageLength: message.length
      };
      
    } catch (error) {
      console.error(`❌ Error sending WhatsApp message to ${phoneNumber}:`, error.message);
      
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      
      throw new Error(`WhatsApp API error: ${error.message}`);
    }
  }

  /**
   * Test WhatsApp configuration
   * @param {string} testPhoneNumber - Test phone number
   * @returns {Promise<Object>} - Test result
   */
  async testConfiguration(testPhoneNumber = '919876543210') {
    try {
      const testMessage = '🧪 This is a test message from Mandapam Association WhatsApp service. If you receive this, the configuration is working correctly!';
      
      const result = await this.sendMessage(testPhoneNumber, testMessage);
      
      return {
        success: true,
        message: 'WhatsApp configuration test successful',
        testPhoneNumber: testPhoneNumber,
        result: result
      };
      
    } catch (error) {
      return {
        success: false,
        message: 'WhatsApp configuration test failed',
        error: error.message,
        testPhoneNumber: testPhoneNumber
      };
    }
  }

  /**
   * Update configuration and reinitialize
   * @param {Object} config - New configuration
   */
  async updateConfiguration(config) {
    try {
      // Deactivate all existing configurations
      await WhatsAppConfig.deactivateAll();
      
      // Create new active configuration
      const newConfig = await WhatsAppConfig.create({
        instanceId: config.instanceId,
        accessToken: config.accessToken,
        isActive: true,
        createdBy: config.createdBy
      });
      
      // Reinitialize service
      await this.initialize();
      
      console.log('✅ WhatsApp configuration updated successfully');
      return newConfig;
      
    } catch (error) {
      console.error('❌ Error updating WhatsApp configuration:', error);
      throw error;
    }
  }

  /**
   * Get current configuration status
   * @returns {Object} - Configuration status
   */
  getStatus() {
    return {
      isEnabled: this.isEnabled,
      hasConfig: !!this.currentConfig,
      instanceId: this.currentConfig?.instanceId || null,
      isActive: this.currentConfig?.isActive || false,
      lastUpdated: this.currentConfig?.updatedAt || null
    };
  }
}

// Create singleton instance
const whatsappService = new WhatsAppService();

module.exports = whatsappService;
