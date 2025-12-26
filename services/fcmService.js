const admin = require('firebase-admin');
const { Op } = require('sequelize');
const { FCMToken, NotificationLog } = require('../models');

class FCMService {
  constructor() {
    this.isInitialized = false;
    this.initializeFirebase();
  }

  initializeFirebase() {
    try {
      // Check if Firebase is already initialized
      if (admin.apps.length === 0) {
        // Check if Firebase credentials are available
        const hasValidCredentials = process.env.FIREBASE_PROJECT_ID && 
                                   process.env.FIREBASE_PRIVATE_KEY && 
                                   process.env.FIREBASE_CLIENT_EMAIL;

        if (!hasValidCredentials) {
          console.log('⚠️ Firebase credentials not configured. FCM notifications will be disabled.');
          console.log('📝 To enable FCM notifications, set the following environment variables:');
          console.log('   - FIREBASE_PROJECT_ID');
          console.log('   - FIREBASE_PRIVATE_KEY');
          console.log('   - FIREBASE_CLIENT_EMAIL');
          console.log('   - FIREBASE_PRIVATE_KEY_ID (optional)');
          console.log('   - FIREBASE_CLIENT_ID (optional)');
          console.log('   - FIREBASE_CLIENT_CERT_URL (optional)');
          this.isInitialized = false;
          return;
        }

        // Initialize Firebase Admin SDK with environment variables
        const serviceAccount = {
          type: "service_account",
          project_id: process.env.FIREBASE_PROJECT_ID,
          private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
          private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          client_id: process.env.FIREBASE_CLIENT_ID,
          auth_uri: "https://accounts.google.com/o/oauth2/auth",
          token_uri: "https://oauth2.googleapis.com/token",
          auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
          client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
        };

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });

        this.isInitialized = true;
        console.log('✅ Firebase Admin SDK initialized successfully');
      } else {
        this.isInitialized = true;
        console.log('✅ Firebase Admin SDK already initialized');
      }
    } catch (error) {
      console.error('❌ Error initializing Firebase Admin SDK:', error);
      this.isInitialized = false;
    }
  }

  async sendNotificationToUser(userId, notification, userType = 'user') {
    if (!this.isInitialized) {
      console.log('⚠️ FCM not initialized - notification not sent');
      return { success: false, message: 'FCM not configured' };
    }

    try {
      // Build where clause based on user type
      const whereClause = {
        isActive: true
      };

      if (userType === 'member') {
        whereClause.memberId = userId;
      } else {
        whereClause.userId = userId;
      }

      // Get active FCM tokens for the user
      const fcmTokens = await FCMToken.findAll({
        where: whereClause
      });

      if (fcmTokens.length === 0) {
        console.log(`No active FCM tokens found for user ${userId}`);
        return { success: false, message: 'No active FCM tokens found' };
      }

      const results = [];
      const tokens = fcmTokens.map(token => token.token);

      // Send notification to all tokens
      for (const token of tokens) {
        try {
          const message = {
            token: token,
            notification: {
              title: notification.title,
              body: notification.body
            },
            data: notification.data || {},
            android: {
              priority: 'high',
              notification: {
                sound: 'default',
                click_action: 'FLUTTER_NOTIFICATION_CLICK'
              }
            },
            apns: {
              payload: {
                aps: {
                  sound: 'default',
                  badge: 1
                }
              }
            }
          };

          const response = await admin.messaging().send(message);
          console.log(`✅ Notification sent successfully to token: ${token.substring(0, 20)}...`);
          
          results.push({ token, success: true, messageId: response });

          // Log successful notification
          await this.logNotification(userId, notification, 'sent', null, notification.eventId);

        } catch (error) {
          console.error(`❌ Error sending notification to token ${token.substring(0, 20)}...:`, error);
          
          results.push({ token, success: false, error: error.message });

          // Log failed notification
          await this.logNotification(userId, notification, 'failed', error.message, notification.eventId);

          // If token is invalid, mark it as inactive
          if (error.code === 'messaging/invalid-registration-token' || 
              error.code === 'messaging/registration-token-not-registered') {
            await this.deactivateToken(token);
          }
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      return {
        success: successCount > 0,
        message: `Sent to ${successCount} devices, failed for ${failureCount} devices`,
        results
      };

    } catch (error) {
      console.error('❌ Error in sendNotificationToUser:', error);
      throw error;
    }
  }

  async sendNotificationToMultipleUsers(userIds, notification) {
    if (!this.isInitialized) {
      console.log('⚠️ FCM not initialized - notifications not sent');
      return userIds.map(userId => ({ userId, success: false, message: 'FCM not configured' }));
    }

    const results = [];
    
    for (const userId of userIds) {
      try {
        const result = await this.sendNotificationToUser(userId, notification);
        results.push({ userId, ...result });
      } catch (error) {
        console.error(`❌ Error sending notification to user ${userId}:`, error);
        results.push({ userId, success: false, error: error.message });
      }
    }

    return results;
  }

  async sendNotificationToAllUsers(notification, userType = 'all') {
    if (!this.isInitialized) {
      console.log('⚠️ FCM not initialized - notification not sent');
      return { success: false, message: 'FCM not configured' };
    }

    // Check if admin.messaging is available
    if (!admin.messaging) {
      console.error('❌ Firebase admin.messaging is not available');
      return { success: false, message: 'Firebase messaging not available' };
    }

    try {
      // Build where clause based on userType
      let whereClause = { isActive: true };
      
      if (userType === 'admin') {
        // Only send to admin users (users table)
        whereClause.userId = { [Op.ne]: null };
      } else if (userType === 'member') {
        // Only send to members
        whereClause.memberId = { [Op.ne]: null };
      }
      // If userType is 'all', send to both (no additional filter)

      // Get active FCM tokens based on userType
      const fcmTokens = await FCMToken.findAll({
        where: whereClause
      });

      if (fcmTokens.length === 0) {
        console.log('No active FCM tokens found');
        return { success: false, message: 'No active FCM tokens found' };
      }

      const tokens = fcmTokens.map(token => token.token);
      const userIds = [...new Set(fcmTokens.map(token => token.userId || token.memberId))];

      // Send notification to all tokens using individual sends (fallback for older SDK versions)
      const results = [];
      let successCount = 0;
      let failureCount = 0;

      for (const token of tokens) {
        try {
          const message = {
            token: token,
            notification: {
              title: notification.title,
              body: notification.body
            },
            data: notification.data || {},
            android: {
              priority: 'high',
              notification: {
                sound: 'default',
                click_action: 'FLUTTER_NOTIFICATION_CLICK'
              }
            },
            apns: {
              payload: {
                aps: {
                  sound: 'default',
                  badge: 1
                }
              }
            }
          };

          const response = await admin.messaging().send(message);
          results.push({ token, success: true, messageId: response });
          successCount++;
        } catch (error) {
          console.error(`❌ Failed to send to token ${token.substring(0, 20)}...:`, error);
          results.push({ token, success: false, error: error.message });
          failureCount++;

          // If token is invalid, mark it as inactive
          if (error.code === 'messaging/invalid-registration-token' || 
              error.code === 'messaging/registration-token-not-registered') {
            await this.deactivateToken(token);
          }
        }
      }

      const response = {
        successCount,
        failureCount,
        responses: results
      };

      console.log(`✅ Multicast notification sent: ${response.successCount} successful, ${response.failureCount} failed`);

      // Log notifications for all users
      for (const fcmToken of fcmTokens) {
        const userId = fcmToken.userId || fcmToken.memberId;
        const userType = fcmToken.userId ? 'user' : 'member';
        await this.logNotification(userId, notification, 'sent', null, notification.eventId, userType);
      }

      // Handle failed tokens
      if (response.failureCount > 0) {
        const failedTokens = response.responses
          .filter(resp => !resp.success)
          .map(resp => resp.token);

        // Deactivate failed tokens
        for (const token of failedTokens) {
          await this.deactivateToken(token);
        }
      }

      return {
        success: response.successCount > 0,
        message: `Sent to ${response.successCount} devices, failed for ${response.failureCount} devices`,
        successCount: response.successCount,
        failureCount: response.failureCount
      };

    } catch (error) {
      console.error('❌ Error in sendNotificationToAllUsers:', error);
      throw error;
    }
  }

  async registerToken(userId, token, deviceType, userType = 'user') {
    try {
      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 FCM Service - registerToken called with:', { userId, token: token.substring(0, 20) + '...', deviceType, userType });
      }
      
      // Check if token already exists
      const existingToken = await FCMToken.findOne({
        where: { token }
      });

      const tokenData = {
        token: token,
        deviceType: deviceType,
        isActive: true,
        lastUsedAt: new Date()
      };

      // Set the appropriate ID based on user type
      if (userType === 'member') {
        tokenData.memberId = userId;
        tokenData.userId = null;
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 FCM Service - Setting memberId:', userId, 'userId: null');
        }
      } else {
        tokenData.userId = userId;
        tokenData.memberId = null;
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 FCM Service - Setting userId:', userId, 'memberId: null');
        }
      }

      if (existingToken) {
        // Update existing token
        await existingToken.update(tokenData);
        // Simplified log - only show success
        console.log(`[FCM] Token updated: ${userType} ${userId}`);
        return { success: true, message: 'Token updated successfully' };
      } else {
        // Create new token
        await FCMToken.create(tokenData);
        // Simplified log - only show success
        console.log(`[FCM] Token registered: ${userType} ${userId}`);
        return { success: true, message: 'Token registered successfully' };
      }
    } catch (error) {
      console.error('❌ Error registering FCM token:', error);
      throw error;
    }
  }

  async deactivateToken(token) {
    try {
      // Use direct update to avoid validation issues
      const [updatedRows] = await FCMToken.update(
        { isActive: false },
        { where: { token }, validate: false }
      );
      
      if (updatedRows > 0) {
        // Simplified log
        console.log(`[FCM] Token deactivated: ${token.substring(0, 20)}...`);
      } else {
        console.log(`⚠️ FCM token not found for deactivation: ${token.substring(0, 20)}...`);
      }
    } catch (error) {
      console.error('❌ Error deactivating FCM token:', error);
    }
  }

  async logNotification(userId, notification, status, errorMessage = null, eventId = null, userType = 'user') {
    try {
      const logData = {
        title: notification.title,
        message: notification.body,
        type: notification.type || 'app_update',
        eventId: eventId,
        status: status,
        errorMessage: errorMessage
      };

      if (userType === 'member') {
        logData.memberId = userId;
        logData.userId = null;
      } else {
        logData.userId = userId;
        logData.memberId = null;
      }

      await NotificationLog.create(logData);
      console.log(`✅ Notification logged for ${userType} ${userId}`);
    } catch (error) {
      console.error('❌ Error logging notification:', error);
    }
  }

  async getNotificationLogs(userId, limit = 50, offset = 0) {
    try {
      const logs = await NotificationLog.findAndCountAll({
        where: { userId },
        order: [['sentAt', 'DESC']],
        limit: limit,
        offset: offset,
        include: [{
          model: require('../models').Event,
          as: 'event',
          attributes: ['id', 'title', 'eventDate']
        }]
      });

      return logs;
    } catch (error) {
      console.error('❌ Error getting notification logs:', error);
      throw error;
    }
  }

  async cleanupInactiveTokens() {
    try {
      // Deactivate tokens that haven't been used in the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await FCMToken.update(
        { isActive: false },
        {
          validate: false,
          where: {
            lastUsedAt: {
              [require('sequelize').Op.lt]: thirtyDaysAgo
            },
            isActive: true
          }
        }
      );

      console.log(`✅ Cleaned up ${result[0]} inactive FCM tokens`);
      return result[0];
    } catch (error) {
      console.error('❌ Error cleaning up inactive tokens:', error);
      throw error;
    }
  }
}

module.exports = new FCMService();
