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
const { Op } = require('sequelize');
const fs = require('fs');
const path = require('path');
const { 
  profileImageUpload, 
  handleMulterError, 
  getFileUrl 
} = require('../config/multerConfig');

const router = express.Router();

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

async function resolveAssociation(associationId) {
  if (associationId) {
    const association = await Association.findByPk(associationId);
    if (!association) {
      throw new Error('Association not found');
    }
    return association;
  }

  const defaultAssociation = await Association.findOne({
    where: { name: 'Other Association' }
  });

  if (!defaultAssociation) {
    throw new Error('Default association "Other Association" not found. Please create it in the Associations list.');
  }

  return defaultAssociation;
}

// Helper function to find or create member
async function findOrCreateMember(memberData) {
  const { phone, name, email, businessName, businessType, city, associationId, profileImage } = memberData;
  
  // Check if member exists by phone
  let member = await Member.findOne({
    where: { phone }
  });
  
  if (member) {
    const updates = {};
    // Member exists - update profile image if provided and not already set
    if (profileImage && !member.profileImage) {
      updates.profileImage = profileImage;
    }

    const association = await resolveAssociation(associationId || member.associationId);

    if (association?.id) {
      if (!member.associationId || (associationId && member.associationId !== association.id)) {
        updates.associationId = association.id;
      }
      if (!member.associationName || updates.associationId) {
        updates.associationName = association.name;
      }
    }

    if (Object.keys(updates).length > 0) {
      await member.update(updates);
    }
    return { member, isNew: false };
  }
  
  // Create new member
  const association = await resolveAssociation(associationId);
  
  // Get association name
  const associationName = association.name;
  
  member = await Member.create({
    name,
    phone,
    email: email || null,
    businessName,
    businessType,
    city,
    associationId: association.id,
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

    // Find or create member
    let memberResult;
    try {
      memberResult = await findOrCreateMember({
        phone,
        name,
        email,
        businessName,
        businessType,
        city: city || null,
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

    const baseUrl = req.protocol + '://' + req.get('host');
    const profileMeta = ensureProfileImageUrl(
      member.profileImageURL || member.profileImage || null,
      baseUrl
    );
    const profileImageURL = profileMeta.url;

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
        phone: member.phone,
        profileImage: profileMeta.stored || member.profileImage || null,
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

// @desc    Save PDF to database
// @route   POST /api/public/events/:id/registrations/:registrationId/save-pdf
// @access  Public
router.post('/events/:id/registrations/:registrationId/save-pdf', [
  body('pdfBase64', 'PDF base64 data is required').notEmpty(),
  body('fileName', 'File name is required').notEmpty()
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
    const registrationId = parseInt(req.params.registrationId, 10);
    const { pdfBase64, fileName } = req.body;

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

    // Validate PDF base64
    if (!pdfBase64 || pdfBase64.length < 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or incomplete PDF data'
      });
    }

    // Create PDFs directory if it doesn't exist
    const pdfsDir = path.join(process.cwd(), 'uploads', 'pdfs');
    if (!fs.existsSync(pdfsDir)) {
      fs.mkdirSync(pdfsDir, { recursive: true });
    }

    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const pdfFileName = `${path.basename(sanitizedFileName, path.extname(sanitizedFileName))}-${uniqueSuffix}.pdf`;
    const pdfFilePath = path.join(pdfsDir, pdfFileName);
    const pdfRelativePath = `pdfs/${pdfFileName}`;

    // Convert base64 to buffer and save to file
    try {
      const pdfBuffer = Buffer.from(pdfBase64, 'base64');
      fs.writeFileSync(pdfFilePath, pdfBuffer);
    } catch (writeError) {
      console.error('Error writing PDF file:', writeError);
      return res.status(500).json({
        success: false,
        message: 'Failed to save PDF file'
      });
    }

    // Save PDF path to database
    await registration.update({
      pdfPath: pdfRelativePath
    });

    // Automatically send WhatsApp after PDF is saved (even if user closes page)
    // This ensures WhatsApp is sent even if frontend is closed
    if (member && member.phone) {
      console.log(`[WhatsApp Auto-Send] Starting auto-send for registration ${registrationId}`);
      console.log(`[WhatsApp Auto-Send] Member: ${member.name || 'N/A'}, Phone: ${member.phone}`);
      console.log(`[WhatsApp Auto-Send] PDF Path: ${pdfFilePath}`);
      console.log(`[WhatsApp Auto-Send] PDF Exists: ${fs.existsSync(pdfFilePath)}`);
      
      whatsappService.sendPdfViaWhatsApp(
        member.phone,
        pdfFilePath,
        member.name || ''
      ).then((result) => {
        console.log(`[WhatsApp Auto-Send] Result for registration ${registrationId}:`, result);
        if (result.success) {
          console.log(`[WhatsApp Auto-Send] ✅ Successfully sent to ${member.phone}`);
          // Update registration to mark PDF as sent
          registration.update({
            pdfSentAt: new Date()
          }).then(() => {
            console.log(`[WhatsApp Auto-Send] ✅ Updated pdfSentAt for registration ${registrationId}`);
          }).catch((updateError) => {
            console.error(`[WhatsApp Auto-Send] ❌ Failed to update pdfSentAt for registration ${registrationId}:`, updateError);
          });
        } else {
          console.error(`[WhatsApp Auto-Send] ❌ Failed for registration ${registrationId}:`, result.error);
        }
      }).catch((whatsappError) => {
        // Log error but don't fail the save PDF request
        // WhatsApp sending can be retried later via send-whatsapp endpoint
        console.error(`[WhatsApp Auto-Send] ❌ Exception for registration ${registrationId}:`, whatsappError);
        if (whatsappError.response) {
          console.error(`[WhatsApp Auto-Send] Response status: ${whatsappError.response.status}`);
          console.error(`[WhatsApp Auto-Send] Response data:`, whatsappError.response.data);
        }
        if (whatsappError.message) {
          console.error(`[WhatsApp Auto-Send] Error message: ${whatsappError.message}`);
        }
      });
    } else {
      console.warn(`[WhatsApp Auto-Send] ⚠️ Skipping auto-send for registration ${registrationId}: member or phone missing`);
      console.warn(`[WhatsApp Auto-Send] Member exists: ${!!member}, Phone: ${member?.phone || 'N/A'}`);
    }

    const baseUrl = req.protocol + '://' + req.get('host');
    const pdfUrl = `${baseUrl}/uploads/${pdfRelativePath}`;

    res.status(200).json({
      success: true,
      message: 'PDF saved successfully. WhatsApp message will be sent automatically.',
      pdfPath: pdfRelativePath,
      pdfUrl: pdfUrl
    });

  } catch (error) {
    console.error('Save PDF error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while saving PDF'
    });
  }
});

// @desc    Download/Fetch PDF from database
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

    // Get registration with PDF path
    const registration = await EventRegistration.findOne({
      where: {
        id: registrationId,
        eventId: eventId
      }
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    if (!registration.pdfPath) {
      return res.status(404).json({
        success: false,
        message: 'PDF not found for this registration. Please generate and save PDF first.'
      });
    }

    // Construct full PDF file path
    const pdfFilePath = path.join(process.cwd(), 'uploads', registration.pdfPath);

    // Check if PDF file exists
    if (!fs.existsSync(pdfFilePath)) {
      return res.status(404).json({
        success: false,
        message: 'PDF file not found on server'
      });
    }

    // Generate filename from registration ID
    const fileName = `mandapam-visitor-pass-${registrationId}.pdf`;

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    // Send PDF file
    res.sendFile(pdfFilePath, (err) => {
      if (err) {
        console.error('Error sending PDF file:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Failed to send PDF file'
          });
        }
      }
    });

  } catch (error) {
    console.error('Download PDF error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while downloading PDF'
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

    if (isNaN(eventId) || isNaN(registrationId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID or registration ID'
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

    if (!registration.pdfPath) {
      return res.status(400).json({
        success: false,
        message: 'PDF not found for this registration. Please save PDF first.'
      });
    }

    // Get member phone number
    const memberPhone = registration.member?.phone;
    if (!memberPhone) {
      return res.status(400).json({
        success: false,
        message: 'Member phone number not found'
      });
    }

    // Get member name for personalized message
    const memberName = registration.member?.name || '';

    // Construct full PDF file path
    const pdfFilePath = path.join(process.cwd(), 'uploads', registration.pdfPath);

    // Check if PDF file exists
    if (!fs.existsSync(pdfFilePath)) {
      return res.status(404).json({
        success: false,
        message: 'PDF file not found on server'
      });
    }

    // Send PDF via WhatsApp
    console.log(`[WhatsApp Manual-Send] Starting manual send for registration ${registrationId}`);
    console.log(`[WhatsApp Manual-Send] Member: ${memberName || 'N/A'}, Phone: ${memberPhone}`);
    console.log(`[WhatsApp Manual-Send] PDF Path: ${pdfFilePath}`);
    console.log(`[WhatsApp Manual-Send] PDF Exists: ${fs.existsSync(pdfFilePath)}`);
    
    const result = await whatsappService.sendPdfViaWhatsApp(
      memberPhone,
      pdfFilePath,
      memberName
    );

    console.log(`[WhatsApp Manual-Send] Result for registration ${registrationId}:`, result);

    if (result.success) {
      console.log(`[WhatsApp Manual-Send] ✅ Successfully sent to ${memberPhone}`);
      // Update registration to mark PDF as sent
      await registration.update({
        pdfSentAt: new Date()
      });
      console.log(`[WhatsApp Manual-Send] ✅ Updated pdfSentAt for registration ${registrationId}`);

      return res.status(200).json({
        success: true,
        message: result.message || 'PDF sent via WhatsApp successfully'
      });
    } else {
      console.error(`[WhatsApp Manual-Send] ❌ Failed for registration ${registrationId}:`, result.error);
      return res.status(500).json({
        success: false,
        message: result.error || 'Failed to send PDF via WhatsApp'
      });
    }

  } catch (error) {
    console.error('Send WhatsApp error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while sending WhatsApp message'
    });
  }
});

module.exports = router;

