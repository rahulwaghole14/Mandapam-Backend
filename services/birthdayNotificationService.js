const { Member, FCMToken } = require('../models');
const fcmService = require('./fcmService');
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

      // Send notification to the specific member
      const result = await fcmService.sendNotificationToUser(
        member.id,
        notification,
        'member'
      );

      console.log(`✅ Birthday notification sent to ${member.name} (ID: ${member.id})`);
      
      return {
        success: true,
        memberId: member.id,
        memberName: member.name,
        notificationSent: result.success,
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

      for (const member of birthdayMembers) {
        const result = await this.sendBirthdayNotification(member);
        results.push(result);
        
        if (result.success && result.notificationSent) {
          successCount++;
        } else {
          failureCount++;
        }
        
        // Add small delay between notifications to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const summary = {
        success: true,
        message: `Birthday notifications processed for ${birthdayMembers.length} members`,
        totalMembers: birthdayMembers.length,
        notificationsSent: successCount,
        notificationsFailed: failureCount,
        results: results
      };

      console.log('🎉 Birthday notification process completed:');
      console.log(`   - Total members: ${summary.totalMembers}`);
      console.log(`   - Notifications sent: ${summary.notificationsSent}`);
      console.log(`   - Notifications failed: ${summary.notificationsFailed}`);

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
}

module.exports = BirthdayNotificationService;
