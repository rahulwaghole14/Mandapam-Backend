const { Member, FCMToken } = require('../models');
const fcmService = require('./fcmService');
const whatsappService = require('./whatsappService');
const { Op } = require('sequelize');

class BirthdayNotificationService {
  /**
   * Get members who have birthday today
   * @returns {Promise<Array>} - Array of members with birthday today
   */
  static async getMembersWithBirthdayToday() {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      console.log(`🎂 Looking for members with birthday on: ${todayStr}`);
      
      const members = await Member.findAll({
        where: {
          isActive: true,
          birthDate: {
            [Op.not]: null
          }
        },
        attributes: ['id', 'name', 'businessName', 'birthDate', 'phone', 'email']
      });
      
      // Filter members whose birthday is today
      const birthdayMembers = members.filter(member => {
        if (!member.birthDate) return false;
        
        const memberBirthDate = new Date(member.birthDate);
        const memberBirthMonth = memberBirthDate.getMonth();
        const memberBirthDay = memberBirthDate.getDate();
        
        const todayMonth = today.getMonth();
        const todayDay = today.getDate();
        
        return memberBirthMonth === todayMonth && memberBirthDay === todayDay;
      });
      
      console.log(`🎉 Found ${birthdayMembers.length} members with birthday today`);
      
      return birthdayMembers;
    } catch (error) {
      console.error('❌ Error getting members with birthday today:', error);
      throw error;
    }
  }

  /**
   * Generate birthday WhatsApp message
   * @param {Object} member - Member object
   * @returns {string} - Birthday message
   */
  static generateBirthdayMessage(member) {
    const playStoreLink = 'https://play.google.com/store/apps/details?id=com.mandapam.expo';
    
    const messages = [
      `🎂 Happy Birthday, ${member.name}! 🎉\n\nWishing you a year filled with joy, success, and prosperity! May your business ${member.businessName} continue to flourish.\n\nBest wishes from Mandapam Association! 🎊\n\n📱 Download our app: ${playStoreLink}`,
      
      `🎈 Happy Birthday, ${member.name}! 🎂\n\nAnother year of amazing achievements! We're grateful to have you as part of our Mandapam Association family.\n\nMay this special day bring you happiness and success! 🌟\n\n📱 Get the Mandapam app: ${playStoreLink}`,
      
      `🎉 Happy Birthday, ${member.name}! 🎊\n\nCelebrating you today! Your dedication to ${member.businessName} inspires us all.\n\nHere's to another year of growth and success! 🚀\n\nBest regards,\nMandapam Association\n\n📱 Download app: ${playStoreLink}`,
      
      `🎂 Wishing you a very Happy Birthday, ${member.name}! 🎈\n\nMay this new year of life bring you endless opportunities and joy. Your contribution to our association is truly valued.\n\nHappy Birthday from all of us at Mandapam Association! 🎊\n\n📱 Install our app: ${playStoreLink}`,
      
      `🌟 Happy Birthday, ${member.name}! 🌟\n\nAnother year, another milestone! We're proud to have you in our Mandapam Association community.\n\nMay your special day be filled with love, laughter, and success! 🎉\n\nBest wishes!\n\n📱 Download Mandapam app: ${playStoreLink}`
    ];
    
    // Return a random message for variety
    return messages[Math.floor(Math.random() * messages.length)];
  }

  /**
   * Send birthday notification to a specific member
   * @param {Object} member - Member object
   * @returns {Promise<Object>} - Notification result
   */
  static async sendBirthdayNotification(member) {
    try {
      const notification = {
        title: '🎂 Happy Birthday!',
        body: `Wishing you a very happy birthday, ${member.name}! 🎉`,
        data: {
          type: 'birthday',
          memberId: member.id.toString(),
          memberName: member.name,
          businessName: member.businessName,
          action: 'birthday_wish'
        }
      };

      // Send push notification to the specific member
      const pushResult = await fcmService.sendNotificationToUser(
        member.id,
        notification,
        'member'
      );

      // Send WhatsApp message if phone number is available
      let whatsappResult = null;
      if (member.phone) {
        try {
          const birthdayMessage = this.generateBirthdayMessage(member);
          whatsappResult = await whatsappService.sendMessage(member.phone, birthdayMessage);
          console.log(`✅ Birthday WhatsApp message sent to ${member.name} (${member.phone})`);
        } catch (whatsappError) {
          console.log(`⚠️ Birthday WhatsApp message failed for ${member.name}:`, whatsappError.message);
          // Don't fail the entire process if WhatsApp fails
        }
      } else {
        console.log(`⚠️ No phone number available for ${member.name}, skipping WhatsApp message`);
      }

      console.log(`✅ Birthday notification sent to ${member.name} (ID: ${member.id})`);
      
      return {
        success: true,
        memberId: member.id,
        memberName: member.name,
        phone: member.phone,
        pushNotificationSent: pushResult.success,
        whatsappMessageSent: whatsappResult ? whatsappResult.success : false,
        whatsappError: whatsappResult ? null : 'No phone number or WhatsApp failed',
        message: `Birthday notification sent to ${member.name}`
      };
    } catch (error) {
      console.error(`❌ Error sending birthday notification to ${member.name}:`, error);
      return {
        success: false,
        memberId: member.id,
        memberName: member.name,
        error: error.message
      };
    }
  }

  /**
   * Send birthday notifications to all members with birthday today
   * @returns {Promise<Object>} - Summary of notifications sent
   */
  static async sendBirthdayNotifications() {
    try {
      console.log('🎂 Starting birthday notification process...');
      
      // Get members with birthday today
      const birthdayMembers = await this.getMembersWithBirthdayToday();
      
      if (birthdayMembers.length === 0) {
        console.log('📅 No members have birthday today');
        return {
          success: true,
          message: 'No members have birthday today',
          totalMembers: 0,
          notificationsSent: 0,
          results: []
        };
      }

      // Send notifications to each member
      const results = [];
      let successCount = 0;
      let failureCount = 0;
      let pushNotificationCount = 0;
      let whatsappMessageCount = 0;
      let whatsappFailureCount = 0;

      for (const member of birthdayMembers) {
        const result = await this.sendBirthdayNotification(member);
        results.push(result);
        
        if (result.success) {
          successCount++;
          if (result.pushNotificationSent) pushNotificationCount++;
          if (result.whatsappMessageSent) whatsappMessageCount++;
          if (result.whatsappError && result.whatsappError !== 'No phone number or WhatsApp failed') {
            whatsappFailureCount++;
          }
        } else {
          failureCount++;
        }
        
        // Add small delay between notifications to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      const summary = {
        success: true,
        message: `Birthday notifications processed for ${birthdayMembers.length} members`,
        totalMembers: birthdayMembers.length,
        notificationsSent: successCount,
        notificationsFailed: failureCount,
        pushNotificationsSent: pushNotificationCount,
        whatsappMessagesSent: whatsappMessageCount,
        whatsappMessagesFailed: whatsappFailureCount,
        results: results
      };

      console.log('🎉 Birthday notification process completed:');
      console.log(`   - Total members: ${summary.totalMembers}`);
      console.log(`   - Notifications sent: ${summary.notificationsSent}`);
      console.log(`   - Notifications failed: ${summary.notificationsFailed}`);
      console.log(`   - Push notifications sent: ${summary.pushNotificationsSent}`);
      console.log(`   - WhatsApp messages sent: ${summary.whatsappMessagesSent}`);
      console.log(`   - WhatsApp messages failed: ${summary.whatsappMessagesFailed}`);

      return summary;
    } catch (error) {
      console.error('❌ Error in birthday notification process:', error);
      return {
        success: false,
        error: error.message,
        totalMembers: 0,
        notificationsSent: 0,
        results: []
      };
    }
  }

  /**
   * Get birthday statistics for the current month
   * @returns {Promise<Object>} - Birthday statistics
   */
  static async getBirthdayStats() {
    try {
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      
      // Get all active members with birth dates
      const members = await Member.findAll({
        where: {
          isActive: true,
          birthDate: {
            [Op.not]: null
          }
        },
        attributes: ['id', 'name', 'birthDate']
      });
      
      // Count birthdays by day for current month
      const birthdayStats = {};
      let todayBirthdays = 0;
      
      members.forEach(member => {
        const birthDate = new Date(member.birthDate);
        const birthMonth = birthDate.getMonth();
        const birthDay = birthDate.getDate();
        
        if (birthMonth === currentMonth) {
          const dayKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;
          birthdayStats[dayKey] = (birthdayStats[dayKey] || 0) + 1;
          
          // Check if today
          if (birthDay === today.getDate()) {
            todayBirthdays++;
          }
        }
      });
      
      return {
        success: true,
        currentMonth: currentMonth + 1,
        currentYear: currentYear,
        todayBirthdays: todayBirthdays,
        monthStats: birthdayStats,
        totalMembersWithBirthdays: members.length
      };
    } catch (error) {
      console.error('❌ Error getting birthday stats:', error);
      throw error;
    }
  }

  /**
   * Test birthday notification for a specific member (for testing purposes)
   * @param {number} memberId - Member ID to test
   * @returns {Promise<Object>} - Test result
   */
  static async testBirthdayNotification(memberId) {
    try {
      const member = await Member.findByPk(memberId, {
        where: { isActive: true },
        attributes: ['id', 'name', 'businessName', 'birthDate', 'phone', 'email']
      });
      
      if (!member) {
        return {
          success: false,
          error: 'Member not found or inactive'
        };
      }
      
      console.log(`🧪 Testing birthday notification for: ${member.name}`);
      
      const result = await this.sendBirthdayNotification(member);
      
      return {
        success: true,
        testResult: result,
        message: `Test birthday notification sent to ${member.name}`
      };
    } catch (error) {
      console.error('❌ Error testing birthday notification:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test WhatsApp birthday message for a specific member (for testing purposes)
   * @param {number} memberId - Member ID to test
   * @returns {Promise<Object>} - Test result
   */
  static async testWhatsAppBirthdayMessage(memberId) {
    try {
      const member = await Member.findByPk(memberId, {
        where: { isActive: true },
        attributes: ['id', 'name', 'businessName', 'phone']
      });
      
      if (!member) {
        return {
          success: false,
          error: 'Member not found or inactive'
        };
      }

      if (!member.phone) {
        return {
          success: false,
          error: 'Member has no phone number'
        };
      }
      
      console.log(`🧪 Testing WhatsApp birthday message for: ${member.name} (${member.phone})`);
      
      const birthdayMessage = this.generateBirthdayMessage(member);
      const result = await whatsappService.sendMessage(member.phone, birthdayMessage);
      
      return {
        success: true,
        memberId: member.id,
        memberName: member.name,
        phone: member.phone,
        message: birthdayMessage,
        whatsappResult: result,
        testMessage: `Test WhatsApp birthday message sent to ${member.name}`
      };
    } catch (error) {
      console.error('❌ Error testing WhatsApp birthday message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = BirthdayNotificationService;
