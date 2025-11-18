const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Event = require('../models/Event');
const Member = require('../models/Member');
const Association = require('../models/Association');
const EventRegistration = require('../models/EventRegistration');
const EventExhibitor = require('../models/EventExhibitor');
const qrService = require('../services/qrService');
const paymentService = require('../services/paymentService');
const whatsappService = require('../services/whatsappService');
const pdfService = require('../services/pdfService');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const fs = require('fs');
const path = require('path');
const { 
  profileImageUpload, 
  handleMulterError, 
  getFileUrl 
} = require('../config/multerConfig');

const router = express.Router();

// Helper function to generate QR code with retry logic
async function generateQrWithRetry(registration, context = 'registration') {
  const maxRetries = 3;
  const retryDelays = [100, 500, 1000]; // milliseconds
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const qrDataURL = await qrService.generateQrDataURL(registration);
      console.log(`✅ QR code generated successfully for ${context} ${registration.id} (attempt ${attempt + 1})`);
      return qrDataURL;
    } catch (qrError) {
      const isLastAttempt = attempt === maxRetries - 1;
      console.error(`⚠️ QR code generation attempt ${attempt + 1}/${maxRetries} failed for ${context} ${registration.id}:`, qrError.message);
      
      if (isLastAttempt) {
        console.error(`❌ All QR code generation attempts failed for ${context}:`, registration.id);
        console.error('Registration was successful, but QR code generation failed. QR can be regenerated later via API.');
        return null; // Return null if all attempts fail
      } else {
        // Wait before retrying (exponential backoff)
        const delay = retryDelays[attempt] || 1000;
        console.log(`⏳ Retrying QR generation in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  return null; // Fallback return
}

const ensureProfileImageUrl = (value, baseUrl) => {
  if (!value) {
    return { url: null, stored: null };
  }

  const stringValue = typeof value === 'string' ? value.trim() : '';
  if (!stringValue) {
    return { url: null, stored: null };
  }

  const httpPattern = /^https?:\/\//i;
  if (httpPattern.test(stringValue)) {
    if (stringValue.includes('/uploads/event-images/')) {
      const filename = stringValue.substring(stringValue.lastIndexOf('/') + 1);
      if (!filename) {
        return { url: stringValue, stored: stringValue };
      }
      const normalizedUrl = `${baseUrl}/uploads/profile-images/${encodeURIComponent(filename)}`;
      return { url: normalizedUrl, stored: `profile-images/${filename}` };
    }
    return { url: stringValue, stored: stringValue };
  }

  const normalizedPath = stringValue.replace(/^\/+/, '').replace(/\\/g, '/');
  let relativePath = normalizedPath;

  if (relativePath.startsWith('uploads/')) {
    relativePath = relativePath.slice('uploads/'.length);
  }

  if (!relativePath.startsWith('profile-images/')) {
    const filename = relativePath.substring(relativePath.lastIndexOf('/') + 1);
    relativePath = `profile-images/${filename}`;
  }

  const resolvedUrl = getFileUrl(relativePath, baseUrl, 'profile-images');
  return { url: resolvedUrl, stored: relativePath };
};

async function resolveAssociation(associationId, transaction = null) {
  if (associationId) {
    const association = await Association.findByPk(associationId, { transaction });
    if (!association) {
      console.error('❌ Association not found:', associationId);
      throw new Error('Association not found');
    }
    return association;
  }

  // Try to find default association
  let defaultAssociation = await Association.findOne({
    where: { name: 'Other Association' },
    transaction
  });

  // Auto-create default association if it doesn't exist
  if (!defaultAssociation) {
    console.warn('⚠️ Default association "Other Association" not found, creating it...');
    try {
      defaultAssociation = await Association.create({
        name: 'Other Association',
        city: 'General',
        district: 'General',
        state: 'Maharashtra',
        isActive: true
      }, { transaction });
      console.log('✅ Default association created successfully:', defaultAssociation.id);
    } catch (createError) {
      console.error('❌ Failed to create default association:', createError);
      throw new Error('Failed to create default association. Please contact administrator.');
    }
  }

  return defaultAssociation;
}

// Helper function to find or create member with validation and transaction support
async function findOrCreateMember(memberData, transaction = null) {
  const { phone, name, email, businessName, businessType, city, associationId, profileImage } = memberData;
  
  console.log('🔍 findOrCreateMember - Starting with data:', {
    phone,
    name,
    businessName,
    businessType,
    city,
    associationId,
    hasProfileImage: !!profileImage
  });
  
  // Pre-validation: Check phone format
  if (!phone || !/^[0-9]{10}$/.test(phone)) {
    console.error('❌ Invalid phone format:', phone);
    throw new Error('Phone number must be exactly 10 digits');
  }
  
  // Pre-validation: Check required fields
  if (!name || name.trim().length < 2) {
    console.error('❌ Invalid name:', name);
    throw new Error('Name must be at least 2 characters');
  }
  
  if (!businessName || businessName.trim().length < 2) {
    console.error('❌ Invalid business name:', businessName);
    throw new Error('Business name must be at least 2 characters');
  }
  
  if (!businessType) {
    console.error('❌ Missing business type');
    throw new Error('Business type is required');
  }
  
  // Check if member exists by phone (with transaction support)
  let member = await Member.findOne({
    where: { phone },
    transaction
  });
  
  if (member) {
    console.log('✅ Member already exists:', member.id);
    const updates = {};
    // Member exists - update profile image if provided and not already set
    if (profileImage && !member.profileImage) {
      updates.profileImage = profileImage;
      console.log('📸 Updating profile image for existing member');
    }

    try {
      const association = await resolveAssociation(associationId || member.associationId, transaction);

      if (association?.id) {
        if (!member.associationId || (associationId && member.associationId !== association.id)) {
          updates.associationId = association.id;
          console.log('🔄 Updating association ID:', association.id);
        }
        if (!member.associationName || updates.associationId) {
          updates.associationName = association.name;
        }
      }

      if (Object.keys(updates).length > 0) {
        await member.update(updates, { transaction });
        console.log('✅ Member updated successfully');
      }
    } catch (updateError) {
      console.error('❌ Error updating existing member:', updateError);
      // Don't fail if update fails, member already exists
    }
    
    return { member, isNew: false };
  }
  
  // Create new member with transaction support
  console.log('🆕 Creating new member...');
  
  try {
    // Resolve association (will auto-create default if needed)
    const association = await resolveAssociation(associationId, transaction);
    
    if (!association || !association.id) {
      console.error('❌ Failed to resolve association');
      throw new Error('Failed to resolve association');
    }
    
    // Get association name
    const associationName = association.name;
    
    console.log('📝 Creating member with association:', {
      associationId: association.id,
      associationName
    });
    
    // Pre-check: Verify phone doesn't exist (double-check before create)
    const duplicateCheck = await Member.findOne({
      where: { phone },
      transaction
    });
    
    if (duplicateCheck) {
      console.log('⚠️ Duplicate member found during creation, returning existing member');
      return { member: duplicateCheck, isNew: false };
    }
    
    // Create member with transaction
    member = await Member.create({
      name: name.trim(),
      phone,
      email: email ? email.trim() : null,
      businessName: businessName.trim(),
      businessType,
      city: city ? city.trim() : null,
      associationId: association.id,
      associationName,
      profileImage: profileImage || null,
      isActive: true,
      isVerified: false
    }, { transaction });
    
    console.log('✅ Member created successfully:', member.id);
    
    // Verify member was actually created
    const verifyMember = await Member.findByPk(member.id, { transaction });
    if (!verifyMember) {
      console.error('❌ Member creation verification failed - member not found after create');
      throw new Error('Member creation failed - verification error');
    }
    
    return { member, isNew: true };
    
  } catch (createError) {
    console.error('❌ Error creating member:', {
      error: createError.message,
      stack: createError.stack,
      phone,
      name,
      businessName
    });
    
    // Check if it's a unique constraint violation (duplicate phone)
    if (createError.name === 'SequelizeUniqueConstraintError' || createError.message?.includes('unique')) {
      console.log('⚠️ Unique constraint violation, member may have been created by another process');
      // Try to find the member
      const existingMember = await Member.findOne({
        where: { phone },
        transaction
      });
      if (existingMember) {
        console.log('✅ Found existing member after unique constraint error');
        return { member: existingMember, isNew: false };
      }
    }
    
    throw new Error(`Failed to create member: ${createError.message}`);
  }
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

    // Generate QR code if registered (with retry logic)
    const qrDataURL = await generateQrWithRetry(registration, 'registration status check');

    const baseUrl = req.protocol + '://' + req.get('host');
    const profileMeta = ensureProfileImageUrl(
      member.profileImageURL || member.profileImage || null,
      baseUrl
    );
    const profileImageURL = profileMeta.url;

    res.status(200).json({
      success: true,
      isRegistered: true,
      registration: {
        id: registration.id,
        eventId: registration.eventId,
        memberId: registration.memberId,
        memberName: member.name,
        status: registration.status,
        paymentStatus: registration.paymentStatus,
        amountPaid: registration.amountPaid,
        registeredAt: registration.registeredAt,
        attendedAt: registration.attendedAt,
        qrDataURL
      },
      member: {
        id: member.id,
        name: member.name,
        phone: member.phone,
        email: member.email || null,
        businessName: member.businessName || null,
        associationId: member.associationId || null,
        associationName: member.associationName || null,
        profileImage: profileMeta.stored || member.profileImage || null,
        profileImageURL,
        city: member.city || null
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
    body('businessName', 'Business name is required').notEmpty().trim(),
    body('businessType', 'Business type is required').isIn(['catering', 'sound', 'mandap', 'madap', 'light', 'decorator', 'photography', 'videography', 'transport', 'other']),
    body('associationId').optional({ checkFalsy: true }).custom((value) => {
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
    const { name, phone, email, businessName, businessType, city } = req.body;
    const associationId = req.body.associationId || null;

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

    // Find or create member with transaction
    let memberResult;
    let memberTransaction;
    
    try {
      memberTransaction = await sequelize.transaction();
      console.log('🔄 Starting transaction for member creation/registration');
      
      memberResult = await findOrCreateMember({
        phone,
        name,
        email,
        businessName,
        businessType,
        city: city || null,
        associationId,
        profileImage: profileImageFilename
      }, memberTransaction);
      
      // Commit transaction after member is created
      await memberTransaction.commit();
      console.log('✅ Member creation transaction committed successfully');
      
    } catch (error) {
      // Rollback transaction on error (if transaction was created)
      if (memberTransaction && !memberTransaction.finished) {
        await memberTransaction.rollback();
        console.error('❌ Member creation transaction rolled back due to error:', error.message);
      }
      
      console.error('❌ Member creation error details:', {
        error: error.message,
        stack: error.stack,
        phone,
        name,
        businessName
      });
      
      return res.status(400).json({
        success: false,
        message: error.message || 'Error creating member',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }

    const { member, isNew } = memberResult;
    
    // Verify member exists in database
    if (!member || !member.id) {
      console.error('❌ Member creation failed - member object invalid');
      return res.status(500).json({
        success: false,
        message: 'Member creation failed - please try again'
      });
    }
    
    console.log('✅ Member verified in database:', member.id);
    
    // Get profile image URL if available (use existing if member already had one)
    if (!profileImageURL) {
      const fallbackMeta = ensureProfileImageUrl(
        member.profileImageURL || member.profileImage || null,
        baseUrl
      );
      profileImageURL = fallbackMeta.url;
      if (!profileImageFilename && fallbackMeta.stored) {
        profileImageFilename = fallbackMeta.stored;
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
      // Create registration with transaction for free events
      const freeEventTransaction = await sequelize.transaction();
      
      try {
        console.log('🔄 Creating free event registration with transaction');
        
        // Create registration immediately for free events
        const registration = await EventRegistration.create({
          eventId,
          memberId: member.id,
          status: 'registered',
          paymentStatus: 'free',
          amountPaid: 0,
          registeredAt: new Date()
        }, { transaction: freeEventTransaction });

        // Verify registration was created
        const verifyRegistration = await EventRegistration.findByPk(registration.id, { transaction: freeEventTransaction });
        if (!verifyRegistration) {
          throw new Error('Registration creation verification failed');
        }

        // Update event attendee count
        await Event.increment('currentAttendees', {
          where: { id: eventId },
          transaction: freeEventTransaction
        });
        
        // Commit transaction
        await freeEventTransaction.commit();
        console.log('✅ Free event registration transaction committed');
        
        // Generate QR code with retry logic (QR is important for pass) - outside transaction
        const qrDataURL = await generateQrWithRetry(registration, 'free event registration');
        
      } catch (freeEventError) {
        // Rollback transaction on error
        await freeEventTransaction.rollback();
        console.error('❌ Free event registration transaction rolled back:', freeEventError);
        throw freeEventError;
      }

      return res.status(201).json({
        success: true,
        isFree: true,
        message: 'Registration successful (free event)',
        member: {
          id: member.id,
          name: member.name,
          phone: member.phone,
          isNew,
          profileImage: profileImageFilename || member.profileImage || null,
          profileImageURL,
          city: member.city || null,
          associationId: member.associationId || null,
          associationName: member.associationName || null
        },
        registration: {
          id: registration.id,
          eventId: registration.eventId,
          memberId: registration.memberId,
          status: registration.status,
          paymentStatus: registration.paymentStatus
        },
        qrDataURL // May be null if generation failed
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
        profileImage: profileImageFilename || member.profileImage || null,
        profileImageURL,
        city: member.city || null,
        associationId: member.associationId || null,
        associationName: member.associationName || null
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

    // Create or update registration with transaction
    const paymentTransaction = await sequelize.transaction();
    let registration;
    const isNewRegistration = !existingRegistration;
    // Check if WhatsApp was already sent (for existing registrations)
    const wasWhatsAppSent = existingRegistration?.pdfSentAt !== null && existingRegistration?.pdfSentAt !== undefined;
    // Should send WhatsApp if: new registration OR existing registration but WhatsApp never sent
    const shouldSendWhatsApp = isNewRegistration || !wasWhatsAppSent;

    try {
      console.log('🔄 Starting transaction for payment confirmation');
      console.log(`[Payment Confirmation] Registration type: ${isNewRegistration ? 'NEW' : 'EXISTING'}, WhatsApp sent: ${wasWhatsAppSent}, Should send: ${shouldSendWhatsApp}`);
      
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
        }, { transaction: paymentTransaction });
        registration = existingRegistration;

        // Only increment attendee count if this was not previously paid
        if (!wasPaid) {
          await Event.increment('currentAttendees', {
            where: { id: eventId },
            transaction: paymentTransaction
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
        }, { transaction: paymentTransaction });

        // Verify registration was created
        const verifyRegistration = await EventRegistration.findByPk(registration.id, { transaction: paymentTransaction });
        if (!verifyRegistration) {
          throw new Error('Registration creation verification failed');
        }

        // Update event attendee count
        await Event.increment('currentAttendees', {
          where: { id: eventId },
          transaction: paymentTransaction
        });
      }
      
      // Commit transaction
      await paymentTransaction.commit();
      console.log('✅ Payment confirmation transaction committed successfully');
      
    } catch (transactionError) {
      // Rollback transaction on error
      await paymentTransaction.rollback();
      console.error('❌ Payment confirmation transaction rolled back:', transactionError);
      throw transactionError;
    }

    // Generate QR code with retry logic (QR is important for pass)
    // This is non-blocking - if it fails, we still return success (QR can be regenerated later)
    let qrDataURL = null;
    try {
      qrDataURL = await generateQrWithRetry(registration, 'paid event registration');
    } catch (qrError) {
      console.error('⚠️ QR generation failed (non-critical):', qrError.message);
      // Continue without QR - registration is still successful
    }

    const baseUrl = req.protocol + '://' + req.get('host');
    let profileImageURL = null;
    let profileImage = null;
    try {
      const profileMeta = ensureProfileImageUrl(
        member.profileImageURL || member.profileImage || null,
        baseUrl
      );
      profileImageURL = profileMeta.url;
      profileImage = profileMeta.stored || member.profileImage || null;
    } catch (profileError) {
      console.error('⚠️ Profile image URL generation failed (non-critical):', profileError.message);
      profileImageURL = member.profileImageURL || member.profileImage || null;
      profileImage = member.profileImage || null;
    }

    // Automatically trigger WhatsApp sending for new registrations OR existing registrations that never received WhatsApp
    // This runs asynchronously and does NOT block the payment confirmation response
    if (shouldSendWhatsApp && member && member.phone) {
      const registrationType = isNewRegistration ? 'NEW' : 'EXISTING (first payment/WhatsApp)';
      console.log(`[Auto-Send] ${registrationType} registration - will send WhatsApp for registration ${registration.id}`);
      console.log(`[Auto-Send] Member: ${member.name || 'N/A'}, Phone: ${member.phone}`);
      
      // Call services directly (no HTTP overhead, no timeout issues)
      // Run in background (don't await - non-blocking)
      const autoSendWithRetry = async () => {
        try {
          const maxRetries = 3;
          const retryDelays = [2000, 5000, 10000]; // 2s, 5s, 10s
          
          // Reload registration with associations to ensure we have fresh data
          const registrationForPdf = await EventRegistration.findOne({
            where: { id: registration.id },
            include: [
              {
                model: Member,
                as: 'member',
                required: true
              },
              {
                model: Event,
                as: 'event',
                required: true
              }
            ]
          });
          
          if (!registrationForPdf || !registrationForPdf.member || !registrationForPdf.event) {
            console.error(`[Auto-Send] Registration or associations not found for registration ${registration.id}`);
            return;
          }
          
          // Validate and clean phone number
          const phoneRegex = /^[6-9]\d{9}$/;
          const cleanPhone = registrationForPdf.member.phone?.trim().replace(/^\+91|^91/, '') || '';
          if (!phoneRegex.test(cleanPhone)) {
            console.error(`[Auto-Send] Invalid phone number format: ${registrationForPdf.member.phone}`);
            return;
          }
          
          const memberName = registrationForPdf.member.name || '';
          let pdfFilePath = null;
          
          for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
              console.log(`[Auto-Send] Attempt ${attempt + 1}/${maxRetries} for registration ${registration.id}`);
            
              // Generate PDF on-demand (only on first attempt or if previous attempt failed)
              if (!pdfFilePath || attempt > 0) {
                try {
                  const pdfFileInfo = await pdfService.generateAndSavePDF(
                    registrationForPdf,
                    registrationForPdf.event,
                    registrationForPdf.member,
                    baseUrl
                  );
                  pdfFilePath = pdfFileInfo.filePath;
                  console.log(`[Auto-Send] PDF generated: ${pdfFilePath} (${(pdfFileInfo.buffer.length / 1024).toFixed(2)} KB)`);
                } catch (pdfError) {
                  console.error(`[Auto-Send] PDF generation failed:`, pdfError.message);
                  // If PDF generation fails, we can't send WhatsApp
                  return;
                }
              }
              
              // Send via WhatsApp
              const result = await whatsappService.sendPdfViaWhatsApp(
                cleanPhone,
                pdfFilePath,
                memberName
              );
              
              if (result.success) {
                console.log(`[Auto-Send] ✅ Success on attempt ${attempt + 1} for registration ${registration.id}`);
                
                // Update registration to mark WhatsApp as sent
                await registrationForPdf.update({
                  pdfSentAt: new Date()
                });
                
                // Delete PDF file after successful send
                if (pdfFilePath) {
                  pdfService.deletePDFFile(pdfFilePath);
                  console.log(`[Auto-Send] ✅ PDF file deleted after successful send`);
                }
                
                return; // Success, exit
              } else {
                console.error(`[Auto-Send] ❌ Attempt ${attempt + 1}/${maxRetries} failed:`, result.error);
                
                // If it's the last attempt, cleanup and exit
                if (attempt === maxRetries - 1) {
                  console.error(`[Auto-Send] ❌ All ${maxRetries} attempts failed for registration ${registration.id}`);
                  // Cleanup PDF file on final failure
                  if (pdfFilePath) {
                    pdfService.deletePDFFile(pdfFilePath);
                    console.log(`[Auto-Send] 🗑️ PDF file deleted after failed send (cleanup)`);
                  }
                  return;
                }
                
                // Wait before retrying
                const delay = retryDelays[attempt] || 10000;
                console.log(`[Auto-Send] ⏳ Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            } catch (whatsappError) {
              console.error(`[Auto-Send] ❌ Exception on attempt ${attempt + 1}/${maxRetries}:`, whatsappError.message);
              
              // If it's the last attempt, cleanup and exit
              if (attempt === maxRetries - 1) {
                console.error(`[Auto-Send] ❌ All ${maxRetries} attempts failed with exceptions for registration ${registration.id}`);
                // Cleanup PDF file on final failure
                if (pdfFilePath) {
                  pdfService.deletePDFFile(pdfFilePath);
                  console.log(`[Auto-Send] 🗑️ PDF file deleted after exception (cleanup)`);
                }
                return;
              }
              
              // Wait before retrying
              const delay = retryDelays[attempt] || 10000;
              console.log(`[Auto-Send] ⏳ Retrying after exception in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        } catch (outerError) {
          // Catch any errors in the outer try block (e.g., database errors)
          console.error(`[Auto-Send] ❌ Outer exception for registration ${registration.id}:`, outerError.message);
        }
      };
      
      // Run auto-send in background (don't await - non-blocking)
      // This ensures payment confirmation response is sent immediately
      // No timeout issues because we're calling services directly, not making HTTP calls
      autoSendWithRetry().catch((whatsappError) => {
        console.error(`[Auto-Send] ❌ EXCEPTION for registration ${registration.id}`);
        console.error(`[Auto-Send] Error: ${whatsappError.message || 'Unknown error'}`);
        console.error(`[Auto-Send] ⚠️ WhatsApp sending failed. Can be retried via send-whatsapp endpoint.`);
      });
    }

    // Always return success if registration was created
    // QR code and profile image are optional enhancements
    res.status(201).json({
      success: true,
      message: 'Registration confirmed',
      registrationId: registration.id,
      qrDataURL, // May be null if generation failed
      isNewRegistration: isNewRegistration, // Flag to indicate if this is a new registration
      shouldSendWhatsApp: shouldSendWhatsApp, // Flag to indicate if WhatsApp will be sent
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
        phone: member.phone,
        profileImage,
        profileImageURL
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

// @desc    Trigger auto-send for new registrations (legacy endpoint - now triggers send-whatsapp)
// @route   POST /api/public/events/:id/registrations/:registrationId/save-pdf
// @access  Public
// @deprecated This endpoint is kept for backward compatibility. PDFs are now generated on-demand.
router.post('/events/:id/registrations/:registrationId/save-pdf', async (req, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);
    const registrationId = parseInt(req.params.registrationId, 10);

    if (isNaN(eventId) || isNaN(registrationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID or registration ID'
      });
    }

    // Verify registration exists and belongs to event
    const registration = await EventRegistration.findOne({
      where: {
        id: registrationId,
        eventId: eventId
      },
      include: [
        {
          model: Member,
          as: 'member',
          required: true
        },
        {
          model: Event,
          as: 'event'
        }
      ]
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    // Get member for WhatsApp sending
    const member = registration.member;

    // Check if this is a new registration or existing one
    // If pdfSentAt already exists, it means WhatsApp was sent before (existing registration)
    // Only send WhatsApp for new registrations
    const isNewRegistration = !registration.pdfSentAt;

    // Automatically send WhatsApp for new registrations only
    // This triggers the send-whatsapp endpoint which generates PDF on-demand
    if (isNewRegistration && member && member.phone) {
      console.log(`[WhatsApp Auto-Send] New registration detected - will send WhatsApp for registration ${registrationId}`);
      console.log(`[WhatsApp Auto-Send] Member: ${member.name || 'N/A'}, Phone: ${member.phone}`);
      
      // Call send-whatsapp endpoint internally (generates PDF, sends, then deletes)
      // Run in background (don't await - non-blocking)
      const autoSendWithRetry = async () => {
        const maxRetries = 3;
        const retryDelays = [2000, 5000, 10000]; // 2s, 5s, 10s
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            console.log(`[WhatsApp Auto-Send] Attempt ${attempt + 1}/${maxRetries} for registration ${registrationId}`);
            
            // Generate PDF, send via WhatsApp, then delete (all handled by send-whatsapp endpoint)
            const axios = require('axios');
            const baseUrl = req.protocol + '://' + req.get('host');
            const sendWhatsAppUrl = `${baseUrl}/api/public/events/${eventId}/registrations/${registrationId}/send-whatsapp`;
            
            const response = await axios.post(sendWhatsAppUrl, {}, {
              timeout: 60000 // 60 seconds timeout
            });
            
            if (response.data.success) {
              console.log(`[WhatsApp Auto-Send] ✅ Success on attempt ${attempt + 1} for registration ${registrationId}`);
              return; // Success, exit
            } else {
              console.error(`[WhatsApp Auto-Send] ❌ Attempt ${attempt + 1}/${maxRetries} failed:`, response.data.message);
              
              // If it's the last attempt, log and exit
              if (attempt === maxRetries - 1) {
                console.error(`[WhatsApp Auto-Send] ❌ All ${maxRetries} attempts failed for registration ${registrationId}`);
                return;
              }
              
              // Wait before retrying
              const delay = retryDelays[attempt] || 10000;
              console.log(`[WhatsApp Auto-Send] ⏳ Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          } catch (whatsappError) {
            console.error(`[WhatsApp Auto-Send] ❌ Exception on attempt ${attempt + 1}/${maxRetries}:`, whatsappError.message);
            
            // If it's the last attempt, log and exit
            if (attempt === maxRetries - 1) {
              console.error(`[WhatsApp Auto-Send] ❌ All ${maxRetries} attempts failed with exceptions for registration ${registrationId}`);
              return;
            }
            
            // Wait before retrying
            const delay = retryDelays[attempt] || 10000;
            console.log(`[WhatsApp Auto-Send] ⏳ Retrying after exception in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      };
      
      // Run auto-send in background (don't await - non-blocking)
      autoSendWithRetry().catch((whatsappError) => {
        console.error(`[WhatsApp Auto-Send] ❌ EXCEPTION for registration ${registrationId}`);
        console.error(`[WhatsApp Auto-Send] Error: ${whatsappError.message || 'Unknown error'}`);
        console.error(`[WhatsApp Auto-Send] ⚠️ WhatsApp sending failed. Can be retried via send-whatsapp endpoint.`);
      });
    } else if (!isNewRegistration) {
      console.log(`[WhatsApp Auto-Send] ⚠️ Skipping auto-send for registration ${registrationId}: Existing registration (WhatsApp already sent)`);
      console.log(`[WhatsApp Auto-Send] pdfSentAt: ${registration.pdfSentAt || 'N/A'}`);
    } else {
      console.warn(`[WhatsApp Auto-Send] ⚠️ Skipping auto-send for registration ${registrationId}: member or phone missing`);
      console.warn(`[WhatsApp Auto-Send] Member exists: ${!!member}, Phone: ${member?.phone || 'N/A'}`);
    }

    // Different message based on whether it's new or existing registration
    const responseMessage = isNewRegistration 
      ? 'Registration confirmed. WhatsApp message will be sent automatically.'
      : 'Registration confirmed. Download option available.';

    res.status(200).json({
      success: true,
      message: responseMessage,
      isNewRegistration: isNewRegistration
    });

  } catch (error) {
    console.error('Save PDF error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while saving PDF'
    });
  }
});

// @desc    Generate and download PDF on-demand
// @route   GET /api/public/events/:id/registrations/:registrationId/download-pdf
// @access  Public
router.get('/events/:id/registrations/:registrationId/download-pdf', async (req, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);
    const registrationId = parseInt(req.params.registrationId, 10);

    if (isNaN(eventId) || isNaN(registrationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID or registration ID'
      });
    }

    // Get registration with member and event
    const registration = await EventRegistration.findOne({
      where: {
        id: registrationId,
        eventId: eventId
      },
      include: [
        {
          model: Member,
          as: 'member',
          required: true
        },
        {
          model: Event,
          as: 'event'
        }
      ]
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    const baseUrl = req.protocol + '://' + req.get('host');
    const fileName = `mandapam-visitor-pass-${registrationId}.pdf`;

    // Generate PDF on-demand
    console.log(`[PDF Download] Generating PDF for registration ${registrationId}`);
    const pdfBuffer = await pdfService.generateVisitorPassPDF(
      registration,
      registration.event,
      registration.member,
      baseUrl
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
    console.log(`[PDF Download] PDF sent successfully for registration ${registrationId}`);

  } catch (error) {
    console.error('[PDF Download] Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while generating PDF'
    });
  }
});

// @desc    Send WhatsApp message with PDF
// @route   POST /api/public/events/:id/registrations/:registrationId/send-whatsapp
// @access  Public
router.post('/events/:id/registrations/:registrationId/send-whatsapp', async (req, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);
    const registrationId = parseInt(req.params.registrationId, 10);

    console.log(`[WhatsApp Send] Request received - Event ID: ${eventId}, Registration ID: ${registrationId}`);

    // Validate IDs
    if (isNaN(eventId) || eventId <= 0) {
      console.error(`[WhatsApp Send] Invalid event ID: ${req.params.id}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID. Event ID must be a positive number.'
      });
    }

    if (isNaN(registrationId) || registrationId <= 0) {
      console.error(`[WhatsApp Send] Invalid registration ID: ${req.params.registrationId}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid registration ID. Registration ID must be a positive number.'
      });
    }

    // Get registration with member and event details
    const registration = await EventRegistration.findOne({
      where: {
        id: registrationId,
        eventId: eventId
      },
      include: [
        {
          model: Member,
          as: 'member',
          required: false // Changed to false to handle cases where member might be missing
        },
        {
          model: Event,
          as: 'event',
          required: false
        }
      ]
    });

    if (!registration) {
      console.error(`[WhatsApp Send] Registration not found - Event ID: ${eventId}, Registration ID: ${registrationId}`);
      return res.status(404).json({
        success: false,
        message: `Registration not found for Event ID ${eventId} and Registration ID ${registrationId}`
      });
    }

    // Check if member exists
    if (!registration.member) {
      console.error(`[WhatsApp Send] Member not found for registration ${registrationId}`);
      return res.status(400).json({
        success: false,
        message: 'Member information not found for this registration'
      });
    }

    // Get member phone number
    const memberPhone = registration.member?.phone;
    if (!memberPhone || memberPhone.trim() === '') {
      console.error(`[WhatsApp Send] Phone number missing for registration ${registrationId}, member ID: ${registration.member.id}`);
      return res.status(400).json({
        success: false,
        message: 'Member phone number is required but not found. Please update the member profile with a valid phone number.'
      });
    }

    // Validate phone number format (should be 10 digits)
    const phoneRegex = /^[6-9]\d{9}$/;
    const cleanPhone = memberPhone.trim().replace(/^\+91|^91/, ''); // Remove country code if present
    if (!phoneRegex.test(cleanPhone)) {
      console.error(`[WhatsApp Send] Invalid phone number format: ${memberPhone}`);
      return res.status(400).json({
        success: false,
        message: `Invalid phone number format: ${memberPhone}. Phone number must be 10 digits starting with 6-9.`
      });
    }

    // Get member name for personalized message
    const memberName = registration.member?.name || '';

    // Generate PDF on-demand
    const baseUrl = req.protocol + '://' + req.get('host');
    console.log(`[WhatsApp Send] Generating PDF for registration ${registrationId}`);
    
    let pdfFilePath = null;
    let pdfFileInfo = null;
    
    try {
      pdfFileInfo = await pdfService.generateAndSavePDF(
        registration,
        registration.event,
        registration.member,
        baseUrl
      );
      pdfFilePath = pdfFileInfo.filePath;
      console.log(`[WhatsApp Send] PDF generated successfully: ${pdfFilePath}`);
      console.log(`[WhatsApp Send] PDF Size: ${(pdfFileInfo.buffer.length / 1024).toFixed(2)} KB`);
    } catch (pdfError) {
      console.error(`[WhatsApp Send] Error generating PDF:`, pdfError);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate visitor pass PDF'
      });
    }

    // Send PDF via WhatsApp with retry logic
    console.log(`[WhatsApp Send] Starting send for registration ${registrationId}`);
    console.log(`[WhatsApp Send] Member: ${memberName || 'N/A'}, Phone: ${cleanPhone}`);
    console.log(`[WhatsApp Send] PDF Path: ${pdfFilePath}`);
    
    // Retry logic for WhatsApp sending (important for pass delivery)
    const maxRetries = 3;
    const retryDelays = [2000, 5000, 10000]; // 2s, 5s, 10s
    let result = null;
    let lastError = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`[WhatsApp Send] Attempt ${attempt + 1}/${maxRetries} for registration ${registrationId}`);
        
        result = await whatsappService.sendPdfViaWhatsApp(
          cleanPhone, // Use cleaned phone number
          pdfFilePath,
          memberName
        );
        
        if (result.success) {
          console.log(`[WhatsApp Send] ✅ Success on attempt ${attempt + 1} for registration ${registrationId}`);
          break; // Success, exit retry loop
        } else {
          lastError = result.error;
          console.error(`[WhatsApp Send] ❌ Attempt ${attempt + 1}/${maxRetries} failed:`, result.error);
          
          // If it's the last attempt, break and return error
          if (attempt === maxRetries - 1) {
            break;
          }
          
          // Wait before retrying
          const delay = retryDelays[attempt] || 10000;
          console.log(`[WhatsApp Send] ⏳ Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (whatsappError) {
        lastError = whatsappError;
        console.error(`[WhatsApp Send] ❌ Exception on attempt ${attempt + 1}/${maxRetries}:`, whatsappError.message);
        
        // If it's the last attempt, break and return error
        if (attempt === maxRetries - 1) {
          result = {
            success: false,
            error: whatsappError.message || 'WhatsApp sending failed after all retries'
          };
          break;
        }
        
        // Wait before retrying
        const delay = retryDelays[attempt] || 10000;
        console.log(`[WhatsApp Send] ⏳ Retrying after exception in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    console.log(`[WhatsApp Send] Final result for registration ${registrationId}:`, {
      success: result?.success,
      message: result?.message,
      error: result?.error || lastError
    });

    if (result.success) {
      console.log(`[WhatsApp Send] ✅ Successfully sent to ${cleanPhone}`);
      
      // Delete PDF file after successful send
      if (pdfFilePath) {
        const deleted = pdfService.deletePDFFile(pdfFilePath);
        if (deleted) {
          console.log(`[WhatsApp Send] ✅ PDF file deleted after successful send`);
        } else {
          console.warn(`[WhatsApp Send] ⚠️ Failed to delete PDF file: ${pdfFilePath}`);
        }
      }
      
      // Update registration to mark PDF as sent
      try {
        await registration.update({
          pdfSentAt: new Date()
        });
        console.log(`[WhatsApp Send] ✅ Updated pdfSentAt for registration ${registrationId}`);
      } catch (updateError) {
        console.error(`[WhatsApp Send] ⚠️ Failed to update pdfSentAt:`, updateError);
        // Don't fail the request if update fails - message was sent successfully
      }

      return res.status(200).json({
        success: true,
        message: result.message || 'PDF sent via WhatsApp successfully',
        phone: cleanPhone
      });
    } else {
      console.error(`[WhatsApp Send] ❌ Failed for registration ${registrationId}:`, result.error);
      
      // Delete PDF file even on failure (cleanup)
      if (pdfFilePath) {
        pdfService.deletePDFFile(pdfFilePath);
        console.log(`[WhatsApp Send] 🗑️ PDF file deleted after failed send (cleanup)`);
      }
      
      // Provide more specific error message
      let errorMessage = 'Failed to send PDF via WhatsApp';
      if (result.error) {
        if (typeof result.error === 'string') {
          errorMessage = result.error;
        } else if (result.error.message) {
          errorMessage = result.error.message;
        }
      }
      
      return res.status(500).json({
        success: false,
        message: errorMessage,
        error: result.error
      });
    }

  } catch (error) {
    console.error('[WhatsApp Send] Exception caught:', error);
    console.error('[WhatsApp Send] Error stack:', error.stack);
    
    // Provide more specific error messages
    let errorMessage = 'Server error while sending WhatsApp message';
    if (error.message) {
      errorMessage = error.message;
    }
    
    // Check for specific error types
    if (error.code === 'ENOENT') {
      errorMessage = 'PDF file not found on server';
    } else if (error.code === 'EACCES') {
      errorMessage = 'Permission denied accessing PDF file';
    } else if (error.name === 'SequelizeDatabaseError') {
      errorMessage = 'Database error occurred while processing request';
    }
    
    return res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

