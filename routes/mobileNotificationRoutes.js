const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protectMobile } = require('../middleware/mobileAuthMiddleware');
const { FCMToken, NotificationLog } = require('../models');
const fcmService = require('../services/fcmService');

// Register FCM token
router.post('/register-token', [
  body('token').notEmpty().withMessage('FCM token is required'),
  body('deviceType').isIn(['android', 'ios']).withMessage('Device type must be android or ios')
], protectMobile, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { token, deviceType } = req.body;
    const userId = req.user.id;

    const result = await fcmService.registerToken(userId, token, deviceType, 'member');

    res.json({
      success: true,
      message: result.message
    });

  } catch (error) {
    console.error('Error registering FCM token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register FCM token',
      error: error.message
    });
  }
});

// Get notification preferences (simplified - just return current status)
router.get('/preferences', protectMobile, async (req, res) => {
  try {
    const userId = req.user.id; // This is actually memberId from mobileAuthMiddleware

    // Check if user has active FCM tokens (for mobile members, use memberId)
    const activeTokens = await FCMToken.count({
      where: {
        memberId: userId, // Use memberId for mobile users
        isActive: true
      }
    });

    res.json({
      success: true,
      preferences: {
        eventNotifications: activeTokens > 0,
        appUpdateNotifications: activeTokens > 0,
        hasActiveTokens: activeTokens > 0
      }
    });

  } catch (error) {
    console.error('Error getting notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification preferences',
      error: error.message
    });
  }
});

// Update notification preferences (simplified - just manage token status)
router.put('/preferences', [
  body('eventNotifications').isBoolean().withMessage('Event notifications must be boolean'),
  body('appUpdateNotifications').isBoolean().withMessage('App update notifications must be boolean')
], protectMobile, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { eventNotifications, appUpdateNotifications } = req.body;
    const userId = req.user.id; // This is actually memberId from mobileAuthMiddleware

    // If both are false, deactivate all tokens
    if (!eventNotifications && !appUpdateNotifications) {
      await FCMToken.update(
        { isActive: false },
        { where: { memberId: userId } } // Use memberId for mobile users
      );
    } else {
      // If any are true, ensure user has active tokens
      const activeTokens = await FCMToken.count({
        where: {
          memberId: userId, // Use memberId for mobile users
          isActive: true
        }
      });

      if (activeTokens === 0) {
        return res.status(400).json({
          success: false,
          message: 'No active FCM tokens found. Please register a token first.'
        });
      }
    }

    res.json({
      success: true,
      message: 'Notification preferences updated successfully'
    });

  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification preferences',
      error: error.message
    });
  }
});

// Get notification history
router.get('/history', protectMobile, async (req, res) => {
  try {
    const userId = req.user.id; // This is actually memberId from mobileAuthMiddleware
    const { limit = 50, offset = 0 } = req.query;

    // For mobile users, we need to get notification logs by memberId
    const logs = await NotificationLog.findAndCountAll({
      where: {
        memberId: userId // Use memberId for mobile users
      },
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: {
        notifications: logs.rows,
        total: logs.count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Error getting notification history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification history',
      error: error.message
    });
  }
});

// Test notification (for development/testing)
router.post('/test', protectMobile, async (req, res) => {
  try {
    const userId = req.user.id; // This is actually memberId from mobileAuthMiddleware
    const { title, body, type = 'app_update' } = req.body;

    if (!title || !body) {
      return res.status(400).json({
        success: false,
        message: 'Title and body are required'
      });
    }

    const notification = {
      title,
      body,
      type,
      data: {
        type: type,
        action: 'test'
      }
    };

    // For mobile users, pass 'member' as userType
    const result = await fcmService.sendNotificationToUser(userId, notification, 'member');

    res.json({
      success: result.success,
      message: result.message,
      result: result
    });

  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
      error: error.message
    });
  }
});

module.exports = router;
