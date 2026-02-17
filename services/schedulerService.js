const cron = require('node-cron');
const BirthdayNotificationService = require('./birthdayNotificationService');
const RefreshTokenService = require('./refreshTokenService');
const AccountDeletionService = require('./accountDeletionService');

class SchedulerService {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  /**
   * Start all scheduled jobs
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️ Scheduler is already running');
      return;
    }

    console.log('🚀 Starting scheduler service...');
    this.isRunning = true;

    // Schedule birthday notifications at 9:00 AM IST daily
    this.scheduleBirthdayNotifications();
    
    // Schedule refresh token cleanup daily at 2:00 AM IST
    this.scheduleRefreshTokenCleanup();
    
    // Schedule account deletion processing daily at 1:00 AM IST
    this.scheduleAccountDeletionProcessing();
    
    // Schedule other jobs here in the future
    // this.scheduleEventReminders();
    // this.scheduleWeeklyReports();

    console.log('✅ Scheduler service started successfully');
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Scheduler is not running');
      return;
    }

    console.log('🛑 Stopping scheduler service...');
    
    // Stop all jobs
    this.jobs.forEach((job, name) => {
      job.stop();
      console.log(`   - Stopped job: ${name}`);
    });
    
    this.jobs.clear();
    this.isRunning = false;
    
    console.log('✅ Scheduler service stopped successfully');
  }

  /**
   * Schedule birthday notifications at 9:00 AM IST daily
   */
  scheduleBirthdayNotifications() {
    // Cron expression for 9:00 AM IST daily
    // IST is UTC+5:30, so 9:00 AM IST = 3:30 AM UTC
    const cronExpression = '30 3 * * *'; // At 03:30 UTC (9:00 AM IST)
    
    const job = cron.schedule(cronExpression, async () => {
      console.log('🎂 Birthday notification job triggered at 9:00 AM IST');
      
      try {
        const result = await BirthdayNotificationService.sendBirthdayNotifications();
        
        if (result.success) {
          console.log('✅ Birthday notifications sent successfully:', {
            totalMembers: result.totalMembers,
            notificationsSent: result.notificationsSent,
            notificationsFailed: result.notificationsFailed
          });
        } else {
          console.error('❌ Birthday notification job failed:', result.error);
        }
      } catch (error) {
        console.error('❌ Error in birthday notification job:', error);
      }
    }, {
      scheduled: false, // Don't start immediately
      timezone: 'Asia/Kolkata' // IST timezone
    });

    this.jobs.set('birthdayNotifications', job);
    job.start();
    
    console.log('📅 Birthday notifications scheduled for 9:00 AM IST daily');
  }

  /**
   * Schedule refresh token cleanup at 2:00 AM IST daily
   */
  scheduleRefreshTokenCleanup() {
    // Cron expression for 2:00 AM IST daily
    // IST is UTC+5:30, so 2:00 AM IST = 8:30 PM UTC (previous day)
    const cronExpression = '30 20 * * *'; // At 20:30 UTC (2:00 AM IST)
    
    const job = cron.schedule(cronExpression, async () => {
      console.log('🧹 Refresh token cleanup job triggered at 2:00 AM IST');
      
      try {
        const cleanedCount = await RefreshTokenService.cleanupExpiredTokens();
        console.log(`✅ Cleaned up ${cleanedCount} expired refresh tokens`);
      } catch (error) {
        console.error('❌ Error in refresh token cleanup job:', error);
      }
    }, {
      scheduled: false, // Don't start immediately
      timezone: 'Asia/Kolkata' // IST timezone
    });

    this.jobs.set('refreshTokenCleanup', job);
    job.start();
    
    console.log('🧹 Refresh token cleanup scheduled for 2:00 AM IST daily');
  }

  /**
   * Schedule account deletion processing at 1:00 AM IST daily
   */
  scheduleAccountDeletionProcessing() {
    // Cron expression for 1:00 AM IST daily
    // IST is UTC+5:30, so 1:00 AM IST = 7:30 PM UTC (previous day)
    const cronExpression = '30 19 * * *'; // At 19:30 UTC (1:00 AM IST)

    const job = cron.schedule(cronExpression, async () => {
      console.log('🗑️ Account deletion processing job triggered at 1:00 AM IST');

      try {
        console.log('Processing scheduled account deletions...');
        await AccountDeletionService.processScheduledDeletions();
        console.log('✅ Account deletion processing completed');
      } catch (error) {
        console.error('❌ Error in account deletion processing job:', error);
      }
    }, {
      scheduled: false,
      timezone: 'Asia/Kolkata'
    });

    this.jobs.set('accountDeletionProcessing', job);
    job.start();

    console.log('🗑️ Account deletion processing scheduled for 1:00 AM IST daily');
  }

  /**
   * Get status of all scheduled jobs
   */
  getStatus() {
    const status = {
      isRunning: this.isRunning,
      jobs: []
    };

    this.jobs.forEach((job, name) => {
      status.jobs.push({
        name: name,
        running: job.running,
        nextRun: job.nextDate ? job.nextDate().toISOString() : null
      });
    });

    return status;
  }

  /**
   * Manually trigger birthday notifications (for testing)
   */
  async triggerBirthdayNotifications() {
    console.log('🧪 Manually triggering birthday notifications...');
    
    try {
      const result = await BirthdayNotificationService.sendBirthdayNotifications();
      console.log('✅ Manual birthday notification trigger completed:', result);
      return result;
    } catch (error) {
      console.error('❌ Error in manual birthday notification trigger:', error);
      throw error;
    }
  }

  /**
   * Test birthday notification for a specific member
   */
  async testBirthdayNotification(memberId) {
    console.log(`🧪 Testing birthday notification for member ID: ${memberId}`);
    
    try {
      const result = await BirthdayNotificationService.testBirthdayNotification(memberId);
      console.log('✅ Test birthday notification completed:', result);
      return result;
    } catch (error) {
      console.error('❌ Error in test birthday notification:', error);
      throw error;
    }
  }

  /**
   * Get birthday statistics
   */
  async getBirthdayStats() {
    try {
      const stats = await BirthdayNotificationService.getBirthdayStats();
      return stats;
    } catch (error) {
      console.error('❌ Error getting birthday stats:', error);
      throw error;
    }
  }

  /**
   * Manually trigger account deletion processing (for testing)
   */
  async triggerAccountDeletionProcessing() {
    console.log('🧪 Manually triggering account deletion processing...');

    try {
      await AccountDeletionService.processScheduledDeletions();
      console.log('✅ Manual account deletion processing completed');
      return { success: true, message: 'Account deletion processing completed' };
    } catch (error) {
      console.error('❌ Error in manual account deletion processing:', error);
      throw error;
    }
  }
}

// Create singleton instance
const schedulerService = new SchedulerService();

module.exports = schedulerService;
