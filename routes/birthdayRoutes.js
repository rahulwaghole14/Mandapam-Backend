const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const BirthdayNotificationService = require('../services/birthdayNotificationService');
const schedulerService = require('../services/schedulerService');

const router = express.Router();

// Apply protection to all routes
router.use(protect);

// @desc    Get birthday statistics
// @route   GET /api/birthday/stats
// @access  Private (Admin only)
router.get('/stats', async (req, res) => {
  try {
    const stats = await BirthdayNotificationService.getBirthdayStats();
    
    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Get birthday stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching birthday statistics'
    });
  }
});

// @desc    Get members with birthday today
// @route   GET /api/birthday/today
// @access  Private (Admin only)
router.get('/today', async (req, res) => {
  try {
    const birthdayMembers = await BirthdayNotificationService.getMembersWithBirthdayToday();
    
    res.status(200).json({
      success: true,
      count: birthdayMembers.length,
      members: birthdayMembers.map(member => ({
        id: member.id,
        name: member.name,
        businessName: member.businessName,
        birthDate: member.birthDate,
        phone: member.phone,
        email: member.email
      }))
    });
  } catch (error) {
    console.error('Get birthday members error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching birthday members'
    });
  }
});

// @desc    Manually trigger birthday notifications
// @route   POST /api/birthday/send-notifications
// @access  Private (Admin only)
router.post('/send-notifications', async (req, res) => {
  try {
    const result = await schedulerService.triggerBirthdayNotifications();
    
    res.status(200).json({
      success: true,
      message: 'Birthday notifications triggered successfully',
      result
    });
  } catch (error) {
    console.error('Trigger birthday notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while triggering birthday notifications'
    });
  }
});

// @desc    Test birthday notification for specific member
// @route   POST /api/birthday/test/:memberId
// @access  Private (Admin only)
router.post('/test/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    
    if (!memberId || isNaN(memberId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid member ID'
      });
    }
    
    const result = await schedulerService.testBirthdayNotification(parseInt(memberId));
    
    res.status(200).json({
      success: true,
      message: 'Test birthday notification completed',
      result
    });
  } catch (error) {
    console.error('Test birthday notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while testing birthday notification'
    });
  }
});

// @desc    Test WhatsApp birthday message for specific member
// @route   POST /api/birthday/test-whatsapp/:memberId
// @access  Private (Admin only)
router.post('/test-whatsapp/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    
    if (!memberId || isNaN(memberId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid member ID'
      });
    }
    
    const result = await BirthdayNotificationService.testWhatsAppBirthdayMessage(parseInt(memberId));
    
    res.status(200).json({
      success: true,
      message: 'Test WhatsApp birthday message completed',
      result
    });
  } catch (error) {
    console.error('Test WhatsApp birthday message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while testing WhatsApp birthday message'
    });
  }
});

// @desc    Get scheduler status
// @route   GET /api/birthday/scheduler/status
// @access  Private (Admin only)
router.get('/scheduler/status', async (req, res) => {
  try {
    const status = schedulerService.getStatus();
    
    res.status(200).json({
      success: true,
      scheduler: status
    });
  } catch (error) {
    console.error('Get scheduler status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching scheduler status'
    });
  }
});

// @desc    Start scheduler
// @route   POST /api/birthday/scheduler/start
// @access  Private (Admin only)
router.post('/scheduler/start', async (req, res) => {
  try {
    schedulerService.start();
    
    res.status(200).json({
      success: true,
      message: 'Scheduler started successfully'
    });
  } catch (error) {
    console.error('Start scheduler error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while starting scheduler'
    });
  }
});

// @desc    Stop scheduler
// @route   POST /api/birthday/scheduler/stop
// @access  Private (Admin only)
router.post('/scheduler/stop', async (req, res) => {
  try {
    schedulerService.stop();
    
    res.status(200).json({
      success: true,
      message: 'Scheduler stopped successfully'
    });
  } catch (error) {
    console.error('Stop scheduler error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while stopping scheduler'
    });
  }
});

module.exports = router;
