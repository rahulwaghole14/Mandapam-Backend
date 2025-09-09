const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const { Member, Association, OTP } = require('../models');
const { Op } = require('sequelize');

const router = express.Router();

// Generate JWT Token for Members
const generateMemberToken = (member) => {
  const tokenData = {
    id: member.id, // Use integer ID instead of ObjectId
    phone: member.phone,
    name: member.name,
    businessName: member.businessName,
    businessType: member.businessType,
    city: member.city,
    associationName: member.association?.name || 'Unknown Association',
    isActive: member.isActive,
    userType: 'member' // Distinguish from admin users
  };
  
  return jwt.sign(tokenData, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '24h'
  });
};

// Generate OTP (Default: "123456" for development)
const generateOTP = () => {
  // For development: Always return "123456"
  return "123456";
  
  // For production: Generate random 6-digit OTP
  // return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP via SMS/WhatsApp (Mock implementation)
const sendOTP = async (mobileNumber, otp) => {
  // TODO: Integrate with SMS/WhatsApp service (Twilio, etc.)
  console.log(`📱 OTP for ${mobileNumber}: ${otp}`);
  console.log(`🔗 SMS Service: OTP sent successfully to ${mobileNumber}`);
  return true;
};

// @desc    Send OTP for mobile login
// @route   POST /api/mobile/send-otp
// @access  Public
router.post('/send-otp', [
  body('mobileNumber', 'Please provide a valid 10-digit mobile number')
    .matches(/^[0-9]{10}$/)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { mobileNumber } = req.body;

    // Check if member exists
    const member = await Member.findOne({ 
      where: { 
        phone: mobileNumber, 
        isActive: true 
      },
      include: [{
        model: Association,
        as: 'association',
        attributes: ['name']
      }]
    });
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Mobile number not registered. Please contact admin for registration.'
      });
    }

    // Check OTP request rate limit (max 10 requests per 15 minutes for development)
    const recentOTPs = await OTP.count({
      where: {
        mobileNumber,
        created_at: {
          [Op.gte]: new Date(Date.now() - 15 * 60 * 1000)
        }
      }
    });

    if (recentOTPs >= 10) {
      return res.status(429).json({
        success: false,
        message: 'Too many OTP requests. Please try again after 15 minutes.'
      });
    }

    // Generate and save OTP
    const otp = generateOTP();
    await OTP.create({
      mobileNumber,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes expiry
    });

    // Send OTP
    await sendOTP(mobileNumber, otp);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully to your mobile number',
      otp: otp // Include OTP in response for development testing
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending OTP'
    });
  }
});

// @desc    Verify OTP and login
// @route   POST /api/mobile/verify-otp
// @access  Public
router.post('/verify-otp', [
  body('mobileNumber', 'Please provide a valid 10-digit mobile number')
    .matches(/^[0-9]{10}$/),
  body('otp', 'Please provide a valid 6-digit OTP')
    .matches(/^[0-9]{6}$/)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { mobileNumber, otp } = req.body;
    
    console.log(`🔍 Verifying OTP for ${mobileNumber}: ${otp}`);

    // Find the most recent valid OTP for this mobile number
    const otpRecord = await OTP.findOne({
      where: {
        mobileNumber,
        otp,
        isUsed: false,
        expiresAt: {
          [Op.gt]: new Date()
        }
      },
      order: [['created_at', 'DESC']] // Get the most recent OTP
    });

    if (!otpRecord) {
      // Check if there's any OTP with this mobile number and OTP (regardless of status)
      const anyOtp = await OTP.findOne({ 
        where: { mobileNumber, otp },
        order: [['created_at', 'DESC']]
      });
      
      if (anyOtp) {
        if (anyOtp.isUsed) {
          console.log(`OTP already used for ${mobileNumber} at ${anyOtp.updated_at}`);
          return res.status(400).json({
            success: false,
            message: 'OTP has already been used. Please request a new OTP.'
          });
        } else if (anyOtp.expiresAt <= new Date()) {
          console.log(`OTP expired for ${mobileNumber} at ${anyOtp.expiresAt}`);
          return res.status(400).json({
            success: false,
            message: 'OTP has expired. Please request a new OTP.'
          });
        }
      }
      
      console.log(`No valid OTP found for ${mobileNumber} with OTP ${otp}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP. Please check the OTP and try again.'
      });
    }

    console.log(`✅ Valid OTP found for ${mobileNumber}, created at: ${otpRecord.created_at}, expires at: ${otpRecord.expiresAt}`);

    // Check attempt limit
    if (otpRecord.attempts >= 3) {
      return res.status(400).json({
        success: false,
        message: 'Too many failed attempts. Please request a new OTP.'
      });
    }

    // Get member details
    const member = await Member.findOne({ 
      where: { 
        phone: mobileNumber, 
        isActive: true 
      },
      include: [{
        model: Association,
        as: 'association',
        attributes: ['name']
      }]
    });
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Mark OTP as used
    await otpRecord.update({ isUsed: true });

    // Generate token
    const token = generateMemberToken(member);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      member: {
        id: member.id,
        name: member.name,
        businessName: member.businessName,
        businessType: member.businessType,
        phone: member.phone,
        city: member.city,
        state: member.state,
        pincode: member.pincode,
        associationName: member.association?.name || 'Unknown Association',
        profileImage: member.profileImage,
        email: member.email,
        isMobileVerified: member.isMobileVerified,
        paymentStatus: member.paymentStatus,
        isActive: member.isActive
      }
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while verifying OTP'
    });
  }
});

// @desc    Register new member
// @route   POST /api/mobile/register
// @access  Public
router.post('/register', [
  body('name', 'Name is required').notEmpty().trim(),
  body('businessName', 'Business name is required').notEmpty().trim(),
  body('businessType', 'Business type is required').isIn(['sound', 'decorator', 'catering', 'generator', 'madap', 'light']),
  body('phone', 'Please add a valid phone number').matches(/^[0-9]{10}$/),
  body('city', 'City is required').notEmpty().trim(),
  body('pincode', 'Pincode is required').matches(/^[0-9]{6}$/),
  body('associationName', 'Association name is required').notEmpty().trim(),
  body('associationId', 'Association ID is required').isInt({ min: 1 }).withMessage('Association ID must be a positive integer'),
  body('state', 'State is required').notEmpty().trim(),
  body('birthDate').optional().isISO8601().withMessage('Birth date must be a valid date'),
  body('email').optional().isEmail().withMessage('Please provide a valid email')
], async (req, res) => {
  try {
    console.log('🔍 Mobile Registration - Request received:');
    console.log('Request body:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    console.log('✅ Validation passed');

    const { name, businessName, businessType, phone, city, pincode, associationName, associationId, state, email, birthDate } = req.body;

    console.log('🔍 Mobile Registration Debug:');
    console.log('Phone number received:', phone);
    console.log('Phone number type:', typeof phone);
    console.log('Association ID received:', associationId);
    console.log('Association ID type:', typeof associationId);

    // Check if member already exists
    const existingMember = await Member.findOne({ where: { phone } });
    console.log('Existing member found:', existingMember);
    
    if (existingMember) {
      console.log('❌ Member already exists with phone:', existingMember.phone);
      return res.status(400).json({
        success: false,
        message: 'Member with this mobile number already exists'
      });
    }

    console.log('✅ No existing member found, proceeding with registration');

    // Create new member
    const member = await Member.create({
      name,
      businessName,
      businessType,
      phone,
      city,
      pincode,
      associationName,
      associationId: associationId || null,
      state: state || 'Maharashtra',
      email: email || null,
      birthDate: birthDate || null,
      isActive: true,
      isMobileVerified: false,
      paymentStatus: 'Pending',
      createdBy: null // Will be set when admin approves
    });

    res.status(201).json({
      success: true,
      message: 'Member registered successfully. Please login with your mobile number.',
      member: {
        _id: member._id,
        name: member.name,
        businessName: member.businessName,
        businessType: member.businessType,
        phone: member.phone,
        city: member.city,
        associationName: member.associationName
      }
    });

  } catch (error) {
    console.error('Member registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while registering member'
    });
  }
});

// @desc    Logout user
// @route   POST /api/mobile/logout
// @access  Private
router.post('/logout', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
});

module.exports = router;
