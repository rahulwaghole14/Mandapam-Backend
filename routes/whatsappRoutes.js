const express = require('express');
const { body, validationResult } = require('express-validator');
const { WhatsAppConfig } = require('../models');
const whatsappService = require('../services/whatsappService');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// @desc    Get WhatsApp configuration status
// @route   GET /api/whatsapp/status
// @access  Private (Admin)
router.get('/status', protect, async (req, res) => {
  try {
    const status = whatsappService.getStatus();
    
    res.status(200).json({
      success: true,
      status: status
    });
  } catch (error) {
    console.error('Get WhatsApp status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching WhatsApp status'
    });
  }
});

// @desc    Get current WhatsApp configuration
// @route   GET /api/whatsapp/config
// @access  Private (Admin)
router.get('/config', protect, async (req, res) => {
  try {
    const config = await WhatsAppConfig.getActiveConfig();
    
    if (!config) {
      return res.status(404).json({
        success: false,
        message: 'No WhatsApp configuration found'
      });
    }
    
    res.status(200).json({
      success: true,
      config: config
    });
  } catch (error) {
    console.error('Get WhatsApp config error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching WhatsApp configuration'
    });
  }
});

// @desc    Save/Update WhatsApp configuration
// @route   POST /api/whatsapp/config
// @access  Private (Admin)
router.post('/config', [
  protect,
  body('instanceId', 'Instance ID is required').notEmpty().trim(),
  body('accessToken', 'Access token is required').notEmpty().trim()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { instanceId, accessToken } = req.body;
    
    // Update configuration
    const config = await whatsappService.updateConfiguration({
      instanceId,
      accessToken,
      createdBy: req.user.id
    });
    
    res.status(200).json({
      success: true,
      message: 'WhatsApp configuration saved successfully',
      config: config
    });
  } catch (error) {
    console.error('Save WhatsApp config error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while saving WhatsApp configuration'
    });
  }
});

// @desc    Test WhatsApp configuration
// @route   POST /api/whatsapp/test
// @access  Private (Admin)
router.post('/test', [
  protect,
  body('testPhoneNumber', 'Test phone number is required')
    .optional()
    .matches(/^[0-9]{10}$/)
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { testPhoneNumber = '9876543210' } = req.body;
    
    // Test the configuration
    const testResult = await whatsappService.testConfiguration(`91${testPhoneNumber}`);
    
    res.status(200).json({
      success: true,
      message: 'WhatsApp configuration test completed',
      testResult: testResult
    });
  } catch (error) {
    console.error('Test WhatsApp config error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while testing WhatsApp configuration',
      error: error.message
    });
  }
});

// @desc    Deactivate WhatsApp configuration
// @route   DELETE /api/whatsapp/config
// @access  Private (Admin)
router.delete('/config', protect, async (req, res) => {
  try {
    await WhatsAppConfig.deactivateAll();
    
    // Reinitialize service
    await whatsappService.initialize();
    
    res.status(200).json({
      success: true,
      message: 'WhatsApp configuration deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate WhatsApp config error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deactivating WhatsApp configuration'
    });
  }
});

// @desc    Get WhatsApp configuration history
// @route   GET /api/whatsapp/history
// @access  Private (Admin)
router.get('/history', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const { count, rows: configs } = await WhatsAppConfig.findAndCountAll({
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: require('../models').User,
          as: 'createdByUser',
          attributes: ['id', 'name', 'email']
        }
      ]
    });
    
    res.status(200).json({
      success: true,
      configs: configs,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get WhatsApp history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching WhatsApp configuration history'
    });
  }
});

module.exports = router;
