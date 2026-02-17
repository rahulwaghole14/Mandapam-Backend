const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/authMiddleware');
const { NotificationLog, User } = require('../models');
const fcmService = require('../services/fcmService');

// Send app update notification to all users
router.post('/send-app-update', [
  body('title').notEmpty().withMessage('Title is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('type').isIn(['app_update', 'maintenance', 'announcement']).withMessage('Type must be app_update, maintenance, or announcement')
], protect, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { title, message, type = 'app_update' } = req.body;

    const notification = {
      title,
      body: message,
      type: type,
      data: {
        type: type,
        action: 'app_update'
      }
    };

    const result = await fcmService.sendNotificationToAllUsers(notification);

    res.json({
      success: result.success,
      message: result.message,
      successCount: result.successCount,
      failureCount: result.failureCount
    });

  } catch (error) {
    console.error('Error sending app update notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send app update notification',
      error: error.message
    });
  }
});

// Send notification to specific users
router.post('/send-to-users', [
  body('userIds').isArray().withMessage('User IDs must be an array'),
  body('userIds.*').isInt().withMessage('Each user ID must be an integer'),
  body('title').notEmpty().withMessage('Title is required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('type').isIn(['event', 'app_update']).withMessage('Type must be event or app_update')
], protect, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { userIds, title, message, type, eventId } = req.body;

    const notification = {
      title,
      body: message,
      type: type,
      data: {
        type: type,
        action: type === 'event' ? 'view_event' : 'app_update',
        eventId: eventId
      },
      eventId: eventId
    };

    const results = await fcmService.sendNotificationToMultipleUsers(userIds, notification);

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    res.json({
      success: successCount > 0,
      message: `Sent to ${successCount} users, failed for ${failureCount} users`,
      successCount,
      failureCount,
      results
    });

  } catch (error) {
    console.error('Error sending notification to users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification to users',
      error: error.message
    });
  }
});

// Get notification logs
router.get('/logs', protect, async (req, res) => {
  try {
    const { 
      limit = 50, 
      offset = 0, 
      type, 
      status, 
      userId,
      startDate,
      endDate
    } = req.query;

    const whereClause = {};
    
    if (type) whereClause.type = type;
    if (status) whereClause.status = status;
    if (userId) whereClause.userId = userId;
    
    if (startDate || endDate) {
      whereClause.sentAt = {};
      if (startDate) whereClause.sentAt[require('sequelize').Op.gte] = new Date(startDate);
      if (endDate) whereClause.sentAt[require('sequelize').Op.lte] = new Date(endDate);
    }

    const logs = await NotificationLog.findAndCountAll({
      where: whereClause,
      order: [['sentAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: require('../models').Event,
          as: 'event',
          attributes: ['id', 'title', 'eventDate']
        }
      ]
    });

    res.json({
      success: true,
      data: {
        logs: logs.rows,
        total: logs.count,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Error getting notification logs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification logs',
      error: error.message
    });
  }
});

// Get notification statistics
router.get('/stats', protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const whereClause = {};
    if (startDate || endDate) {
      whereClause.sentAt = {};
      if (startDate) whereClause.sentAt[require('sequelize').Op.gte] = new Date(startDate);
      if (endDate) whereClause.sentAt[require('sequelize').Op.lte] = new Date(endDate);
    }

    const [totalSent, totalFailed, byType, byStatus] = await Promise.all([
      NotificationLog.count({ where: { ...whereClause, status: 'sent' } }),
      NotificationLog.count({ where: { ...whereClause, status: 'failed' } }),
      NotificationLog.findAll({
        attributes: [
          'type',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        where: whereClause,
        group: ['type']
      }),
      NotificationLog.findAll({
        attributes: [
          'status',
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count']
        ],
        where: whereClause,
        group: ['status']
      })
    ]);

    res.json({
      success: true,
      data: {
        totalSent,
        totalFailed,
        totalNotifications: totalSent + totalFailed,
        byType: byType.reduce((acc, item) => {
          acc[item.type] = parseInt(item.dataValues.count);
          return acc;
        }, {}),
        byStatus: byStatus.reduce((acc, item) => {
          acc[item.status] = parseInt(item.dataValues.count);
          return acc;
        }, {})
      }
    });

  } catch (error) {
    console.error('Error getting notification statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get notification statistics',
      error: error.message
    });
  }
});

// Cleanup inactive tokens
router.post('/cleanup-tokens', protect, async (req, res) => {
  try {
    const cleanedCount = await fcmService.cleanupInactiveTokens();

    res.json({
      success: true,
      message: `Cleaned up ${cleanedCount} inactive tokens`,
      cleanedCount
    });

  } catch (error) {
    console.error('Error cleaning up tokens:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cleanup tokens',
      error: error.message
    });
  }
});

module.exports = router;
