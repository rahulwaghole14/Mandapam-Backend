const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { Member, AccountDeletionRequest } = require('../models');
const { Op } = require('sequelize');
const axios = require('axios');

// Helper to call mobile OTP endpoints
async function callMobileSendOTP(mobileNumber) {
  try {
    const response = await axios.post(`${process.env.API_BASE_URL || 'http://localhost:3001'}/api/mobile/send-otp`, {
      mobileNumber
    });
    return response.data;
  } catch (error) {
    console.error('Error calling mobile send-otp:', error.response?.data || error.message);
    throw error;
  }
}

async function callMobileVerifyOTP(mobileNumber, otp) {
  try {
    const response = await axios.post(`${process.env.API_BASE_URL || 'http://localhost:3001'}/api/mobile/verify-otp`, {
      mobileNumber,
      otp
    });
    return response.data;
  } catch (error) {
    console.error('Error calling mobile verify-otp:', error.response?.data || error.message);
    throw error;
  }
}

// @route   POST /api/account/request-deletion
// @desc    Request account deletion (uses mobile OTP flow)
// @access  Public
router.post('/request-deletion', [
  check('mobileNumber', 'Mobile number is required').not().isEmpty(),
  check('mobileNumber', 'Please include a valid mobile number').isMobilePhone()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { mobileNumber } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];

  try {
    // Check if member exists
    const member = await Member.findOne({ 
      where: { phone: mobileNumber } 
    });

    if (!member) {
      return res.status(404).json({ 
        success: false, 
        message: 'No account found with this mobile number' 
      });
    }

    // Check for existing pending/verified deletion request
    const existingRequest = await AccountDeletionRequest.findOne({
      where: {
        mobileNumber,
        status: { [Op.in]: ['pending', 'verified'] },
        deletionScheduledAt: { [Op.gt]: new Date() }
      }
    });

    // Use mobile OTP service to send OTP
    const otpResult = await callMobileSendOTP(mobileNumber);

    if (existingRequest) {
      // Return existing request info with OTP for verification
      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully',
        requestId: existingRequest.id,
        mobileNumber: mobileNumber.replace(/\d(?=\d{4})/g, '*'),
        otp: otpResult.otp,
        deliveryMethod: otpResult.deliveryMethod,
        existingRequest: true,
        status: existingRequest.status,
        deletionScheduledAt: existingRequest.deletionScheduledAt
      });
    }

    // Create deletion request (no OTP stored here)
    const deletionRequest = await AccountDeletionRequest.create({
      mobileNumber,
      memberId: member.id,
      memberName: member.name,
      memberBusinessName: member.businessName || '',
      memberEmail: member.email || '',
      status: 'pending',
      requestedAt: new Date(),
      deletionScheduledAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      ipAddress,
      userAgent
    });

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      requestId: deletionRequest.id,
      mobileNumber: mobileNumber.replace(/\d(?=\d{4})/g, '*'), // Mask all but last 4 digits
      otp: otpResult.otp, // Include OTP for development/testing (same as mobile flow)
      deliveryMethod: otpResult.deliveryMethod
    });

  } catch (error) {
    console.error('Error in request-deletion:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during deletion request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/account/confirm-deletion
// @desc    Confirm account deletion with OTP (uses mobile OTP verification)
// @access  Public
router.post('/confirm-deletion', [
  check('requestId', 'Request ID is required').not().isEmpty(),
  check('otp', 'OTP is required').not().isEmpty(),
  check('otp', 'OTP must be 6 digits').isLength({ min: 6, max: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { requestId, otp } = req.body;

  try {
    // Find the deletion request
    const deletionRequest = await AccountDeletionRequest.findByPk(requestId);
    if (!deletionRequest) {
      return res.status(404).json({
        success: false,
        message: 'Invalid request ID'
      });
    }

    // Check if request is already processed (only allow pending and verified)
    if (deletionRequest.status !== 'pending' && deletionRequest.status !== 'verified') {
      return res.status(400).json({
        success: false,
        message: `This request has already been ${deletionRequest.status}`
      });
    }

    // Use mobile OTP service to verify OTP
    const verifyResult = await callMobileVerifyOTP(deletionRequest.mobileNumber, otp);
    
    if (!verifyResult.success) {
      return res.status(400).json({
        success: false,
        message: verifyResult.message || 'OTP verification failed'
      });
    }

    // Update deletion request status to 'verified' (only if still pending)
    if (deletionRequest.status === 'pending') {
      await deletionRequest.update({ 
        status: 'verified',
        verifiedAt: new Date(),
        otpVerified: true
      });
    }

    res.status(200).json({
      success: true,
      message: 'Account deletion request confirmed. Your account will be deleted after the 15-day waiting period.',
      deletionScheduledAt: deletionRequest.deletionScheduledAt
    });

  } catch (error) {
    console.error('Error in confirm-deletion:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during deletion confirmation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   GET /api/account/deletion-status
// @desc    Check status of account deletion request
// @access  Public
router.get('/deletion-status', [
  check('mobileNumber', 'Mobile number is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { mobileNumber } = req.query;

  try {
    const deletionRequest = await AccountDeletionRequest.findOne({
      where: {
        mobileNumber,
        status: { [Op.in]: ['pending', 'verified'] },
        deletionScheduledAt: { [Op.gt]: new Date() }
      },
      order: [['createdAt', 'DESC']]
    });

    if (!deletionRequest) {
      return res.status(404).json({
        success: false,
        message: 'No active deletion request found'
      });
    }

    res.status(200).json({
      success: true,
      status: deletionRequest.status,
      requestedAt: deletionRequest.requestedAt,
      deletionScheduledAt: deletionRequest.deletionScheduledAt,
      daysRemaining: Math.ceil((deletionRequest.deletionScheduledAt - new Date()) / (1000 * 60 * 60 * 24))
    });

  } catch (error) {
    console.error('Error in deletion-status:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking deletion status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @route   POST /api/account/cancel-deletion
// @desc    Cancel a pending account deletion (user already authenticated)
// @access  Public
router.post('/cancel-deletion', [
  check('requestId', 'Request ID is required').not().isEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { requestId } = req.body;

  try {
    const deletionRequest = await AccountDeletionRequest.findByPk(requestId);
    
    if (!deletionRequest) {
      return res.status(404).json({
        success: false,
        message: 'No deletion request found with this ID'
      });
    }

    if (deletionRequest.status !== 'pending' && deletionRequest.status !== 'verified') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a request that is ${deletionRequest.status}`
      });
    }

    await deletionRequest.update({ 
      status: 'cancelled',
      cancelledAt: new Date(),
      cancellationReason: 'User requested cancellation'
    });

    res.status(200).json({
      success: true,
      message: 'Account deletion request has been cancelled',
      cancelledAt: new Date()
    });

  } catch (error) {
    console.error('Error in cancel-deletion:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling deletion request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
