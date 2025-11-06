const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Event = require('../models/Event');
const Member = require('../models/Member');
const Association = require('../models/Association');
const EventRegistration = require('../models/EventRegistration');
const EventExhibitor = require('../models/EventExhibitor');
const qrService = require('../services/qrService');
const paymentService = require('../services/paymentService');
const { Op } = require('sequelize');
const { 
  profileImageUpload, 
  handleMulterError, 
  getFileUrl 
} = require('../config/multerConfig');

const router = express.Router();

// Helper function to find or create member
async function findOrCreateMember(memberData) {
  const { phone, name, email, businessName, businessType, city, associationId, profileImage } = memberData;
  
  // Check if member exists by phone
  let member = await Member.findOne({
    where: { phone }
  });
  
  if (member) {
    // Member exists - update profile image if provided and not already set
    if (profileImage && !member.profileImage) {
      await member.update({ profileImage });
    }
    return { member, isNew: false };
  }
  
  // Create new member
  // Validate association exists
  const association = await Association.findByPk(associationId);
  if (!association) {
    throw new Error('Association not found');
  }
  
  // Get association name
  const associationName = association.name;
  
  member = await Member.create({
    name,
    phone,
    email: email || null,
    businessName,
    businessType,
    city,
    associationId,
    associationName,
    profileImage: profileImage || null,
    isActive: true,
    isVerified: false
  });
  
  return { member, isNew: true };
}

// @desc    Get associations by city (Public - for registration form)
// @route   GET /api/public/associations
// @access  Public
router.get('/associations', [
  query('city', 'City is required').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { city } = req.query;

    // Find associations matching city
    const associations = await Association.findAll({
      where: {
        isActive: true,
        [Op.or]: [
          { city: { [Op.iLike]: `%${city}%` } },
          { district: { [Op.iLike]: `%${city}%` } }
        ]
      },
      attributes: ['id', 'name', 'city', 'district', 'state'],
      order: [['name', 'ASC']]
    });

    res.status(200).json({
      success: true,
      associations,
      count: associations.length
    });

  } catch (error) {
    console.error('Get associations by city error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching associations'
    });
  }
});

// @desc    Get event details (Public)
// @route   GET /api/public/events/:id
// @access  Public
router.get('/events/:id', async (req, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);
    
    if (isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID format'
      });
    }

    const event = await Event.findOne({
      where: {
        id: eventId,
        isPublic: true,
        isActive: true
      },
      attributes: { exclude: ['createdBy', 'updatedBy'] },
      include: [{ model: EventExhibitor, as: 'exhibitors' }]
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found or not accessible'
      });
    }

    res.status(200).json({
      success: true,
      event
    });

  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching event'
    });
  }
});

// @desc    Check registration status by phone (Public)
// @route   GET /api/public/events/:id/check-registration
// @access  Public
router.get('/events/:id/check-registration', [
  query('phone', 'Phone number is required').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const eventId = parseInt(req.params.id, 10);
    const { phone } = req.query;

    if (isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID format'
      });
    }

    // Find member by phone
    const member = await Member.findOne({
      where: { phone }
    });

    if (!member) {
      return res.status(200).json({
        success: true,
        isRegistered: false,
        message: 'Member not found. You can register now.'
      });
    }

    // Check registration
    const registration = await EventRegistration.findOne({
      where: { eventId, memberId: member.id },
      include: [{ model: Event, as: 'event' }]
    });

    if (!registration) {
      return res.status(200).json({
        success: true,
        isRegistered: false,
        message: 'Not registered for this event'
      });
    }

    // Generate QR code if registered
    const qrDataURL = await qrService.generateQrDataURL(registration);

    res.status(200).json({
      success: true,
      isRegistered: true,
      registration: {
        id: registration.id,
        eventId: registration.eventId,
        memberId: registration.memberId,
        status: registration.status,
        paymentStatus: registration.paymentStatus,
        amountPaid: registration.amountPaid,
        registeredAt: registration.registeredAt,
        attendedAt: registration.attendedAt,
        qrDataURL
      },
      event: registration.event ? {
        id: registration.event.id,
        title: registration.event.title,
        startDate: registration.event.startDate,
        endDate: registration.event.endDate,
        status: registration.event.status
      } : null
    });

  } catch (error) {
    console.error('Check registration status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking registration status'
    });
  }
});

// @desc    Initiate payment registration (Public - Member creation + payment initiation)
// @route   POST /api/public/events/:id/register-payment
// @access  Public
router.post('/events/:id/register-payment', 
  [
    body('name', 'Name is required').notEmpty().trim(),
    body('phone', 'Phone number is required').notEmpty().matches(/^[0-9]{10}$/).withMessage('Phone must be 10 digits'),
    body('email', 'Email is required').isEmail().normalizeEmail(),
    body('businessName', 'Business name is required').notEmpty().trim(),
    body('businessType', 'Business type is required').isIn(['catering', 'sound', 'mandap', 'madap', 'light', 'decorator', 'photography', 'videography', 'transport', 'other']),
    body('city', 'City is required').notEmpty().trim(),
    body('associationId', 'Association ID is required').custom((value) => {
      const num = parseInt(value, 10);
      if (isNaN(num) || num < 1) {
        throw new Error('Association ID must be a valid positive integer');
      }
      return true;
    }).toInt(),
    body('photo').optional().custom((value) => {
      if (!value || value === '' || value === null || value === undefined) return true;
      // Accept Cloudinary URL
      if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
        return value.length <= 500;
      }
      return false;
    }).withMessage('Photo must be a valid Cloudinary URL')
  ], 
  async (req, res) => {
  try {
    // Log request details for debugging
    console.log('Register payment request:', {
      method: req.method,
      url: req.url,
      contentType: req.get('Content-Type'),
      body: req.body,
      bodyKeys: Object.keys(req.body || {}),
      bodyLength: JSON.stringify(req.body || {}).length
    });

    // Check if body is empty or missing required fields
    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Request body is empty. Please ensure data is being sent correctly.',
        contentType: req.get('Content-Type'),
        hint: 'If using form-urlencoded, ensure data is properly serialized. If using JSON, set Content-Type to application/json.'
      });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const eventId = parseInt(req.params.id, 10);
    const { name, phone, email, businessName, businessType, city, associationId } = req.body;

    if (isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID'
      });
    }

    // Get event
    const event = await Event.findOne({
      where: {
        id: eventId,
        isPublic: true,
        isActive: true
      }
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found or not accessible'
      });
    }

    // Check if event is in the past or completed
    const now = new Date();
    const eventEndDate = new Date(event.endDate);
    if (eventEndDate < now) {
      return res.status(400).json({
        success: false,
        message: 'Cannot register for past or completed events'
      });
    }

    // Handle profile image upload
    let profileImageFilename = null;
    let profileImageURL = null;
    const baseUrl = req.protocol + '://' + req.get('host');
    
    // Handle profile photo URL (Cloudinary)
    if (req.body.photo) {
      profileImageURL = req.body.photo.trim();
      profileImageFilename = profileImageURL; // Store URL directly
      console.log('Profile photo URL received:', profileImageURL);
    }

    // Find or create member
    let memberResult;
    try {
      memberResult = await findOrCreateMember({
        phone,
        name,
        email,
        businessName,
        businessType,
        city,
        associationId,
        profileImage: profileImageFilename
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || 'Error creating member'
      });
    }

    const { member, isNew } = memberResult;
    
    // Get profile image URL if available (use existing if member already had one)
    if (!profileImageURL && member.profileImage) {
      // Check if it's already a Cloudinary URL
      if (member.profileImage.startsWith('http://') || member.profileImage.startsWith('https://')) {
        profileImageURL = member.profileImage;
      } else {
        // Legacy local file - generate URL
        profileImageURL = getFileUrl(member.profileImage, baseUrl, 'profile-images');
      }
    }

    // Check if already registered for this event
    const existingRegistration = await EventRegistration.findOne({
      where: { eventId, memberId: member.id }
    });

    if (existingRegistration) {
      return res.status(400).json({
        success: false,
        message: 'Already registered for this event',
        registrationId: existingRegistration.id,
        paymentStatus: existingRegistration.paymentStatus
      });
    }

    const fee = Number(event.registrationFee || 0);

    // If event is free, return success without payment
    if (!(fee > 0)) {
      // Create registration immediately for free events
      const registration = await EventRegistration.create({
        eventId,
        memberId: member.id,
        status: 'registered',
        paymentStatus: 'free',
        amountPaid: 0,
        registeredAt: new Date()
      });

      // Update event attendee count
      await Event.increment('currentAttendees', {
        where: { id: eventId }
      });

      // Generate QR code
      const qrDataURL = await qrService.generateQrDataURL(registration);

      return res.status(201).json({
        success: true,
        isFree: true,
        message: 'Registration successful (free event)',
        member: {
          id: member.id,
          name: member.name,
          phone: member.phone,
          isNew,
          profileImageURL
        },
        registration: {
          id: registration.id,
          eventId: registration.eventId,
          memberId: registration.memberId,
          status: registration.status,
          paymentStatus: registration.paymentStatus
        },
        qrDataURL
      });
    }

    // Check if Razorpay is configured
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error('Razorpay not configured: Missing RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET');
      return res.status(500).json({
        success: false,
        message: 'Payment gateway is not configured. Please contact administrator.'
      });
    }

    // Create Razorpay order
    const order = await paymentService.createOrder(fee, `evt_${eventId}_mem_${member.id}_${Date.now()}`);

    // Prepare payment options for frontend
    const paymentOptions = {
      key: process.env.RAZORPAY_KEY_ID,
      amount: order.amount, // Already in paise
      currency: 'INR',
      name: event.title || 'Event Registration',
      description: `Event Registration Fee - ${event.title || 'Event'}`,
      order_id: order.id,
      prefill: {
        name: member.name || '',
        email: member.email || '',
        contact: member.phone || ''
      },
      theme: {
        color: '#2563eb'
      },
      notes: {
        eventId: eventId.toString(),
        memberId: member.id.toString(),
        eventName: event.title
      }
    };

    return res.status(201).json({
      success: true,
      isFree: false,
      message: 'Member created/retrieved. Payment required.',
      member: {
        id: member.id,
        name: member.name,
        phone: member.phone,
        isNew,
        profileImageURL
      },
      order,
      keyId: process.env.RAZORPAY_KEY_ID,
      paymentOptions
    });

  } catch (error) {
    console.error('Register payment error:', error);
    const errorMessage = error.message || 'Server error while initiating registration';
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @desc    Confirm payment and create registration (Public)
// @route   POST /api/public/events/:id/confirm-payment
// @access  Public
router.post('/events/:id/confirm-payment', [
  body('memberId', 'Member ID is required').isInt({ min: 1 }),
  body('razorpay_order_id', 'Razorpay order ID is required').notEmpty(),
  body('razorpay_payment_id', 'Razorpay payment ID is required').notEmpty(),
  body('razorpay_signature', 'Razorpay signature is required').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const eventId = parseInt(req.params.id, 10);
    const { memberId, razorpay_order_id, razorpay_payment_id, razorpay_signature, notes } = req.body;

    if (isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID'
      });
    }

    // Get event
    const event = await Event.findOne({
      where: {
        id: eventId,
        isPublic: true,
        isActive: true
      }
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found or not accessible'
      });
    }

    // Verify member exists
    const member = await Member.findByPk(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Check if already registered
    const existingRegistration = await EventRegistration.findOne({
      where: { eventId, memberId }
    });

    if (existingRegistration && existingRegistration.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Already registered and paid for this event'
      });
    }

    const fee = Number(event.registrationFee || 0);

    // If event is free, this shouldn't be called (should use register-payment)
    if (!(fee > 0)) {
      return res.status(400).json({
        success: false,
        message: 'This event is free. Please use the register-payment endpoint.'
      });
    }

    // Verify payment signature
    if (!paymentService.verifySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    const amountPaid = fee;

    // Create or update registration
    let registration;
    const isNewRegistration = !existingRegistration;

    if (existingRegistration) {
      // Update existing registration
      const wasPaid = existingRegistration.paymentStatus === 'paid';
      await existingRegistration.update({
        paymentStatus: 'paid',
        amountPaid: amountPaid,
        paymentOrderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        status: 'registered',
        notes: notes || existingRegistration.notes,
        registeredAt: existingRegistration.registeredAt || new Date()
      });
      registration = existingRegistration;

      // Only increment attendee count if this was not previously paid
      if (!wasPaid) {
        await Event.increment('currentAttendees', {
          where: { id: eventId }
        });
      }
    } else {
      // Create new registration
      registration = await EventRegistration.create({
        eventId,
        memberId,
        status: 'registered',
        paymentStatus: 'paid',
        amountPaid: amountPaid,
        paymentOrderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        notes: notes || null,
        registeredAt: new Date()
      });

      // Update event attendee count
      await Event.increment('currentAttendees', {
        where: { id: eventId }
      });
    }

    // Generate QR code
    const qrDataURL = await qrService.generateQrDataURL(registration);

    res.status(201).json({
      success: true,
      message: 'Registration confirmed',
      registrationId: registration.id,
      qrDataURL,
      registration: {
        id: registration.id,
        eventId: registration.eventId,
        memberId: registration.memberId,
        status: registration.status,
        paymentStatus: registration.paymentStatus,
        amountPaid: registration.amountPaid,
        registeredAt: registration.registeredAt
      },
      member: {
        id: member.id,
        name: member.name,
        phone: member.phone
      }
    });

  } catch (error) {
    console.error('Confirm payment error:', error);
    const errorMessage = error.message || 'Server error while confirming payment';
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

module.exports = router;

