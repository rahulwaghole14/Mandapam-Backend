const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const path = require('path');
const Event = require('../models/Event');
const Member = require('../models/Member');
const Association = require('../models/Association');
const EventRegistration = require('../models/EventRegistration');
const EventExhibitor = require('../models/EventExhibitor');
const qrService = require('../services/qrService');
const paymentService = require('../services/paymentService');
const User = require('../models/User');
const { protect, authorize, authorizeDistrict } = require('../middleware/authMiddleware');
const fcmService = require('../services/fcmService');
const Logger = require('../utils/logger');
const { sequelize } = require('../config/database');
const pdfService = require('../services/pdfService');
const { acquireWhatsAppLock, releaseWhatsAppLock, updateLockToSentTime } = require('../utils/whatsappLock');

// Import queue service (with fallback if Redis not available)
let whatsappQueue = null;
try {
  whatsappQueue = require('../services/whatsappQueue');
  Logger.info('Event Routes: WhatsApp queue loaded');
} catch (error) {
  Logger.warn('Event Routes: WhatsApp queue not available (Redis may not be configured)', { error: error.message });
}
const {
  eventImagesUpload,
  handleMulterError,
  getFileUrl,
  deleteFile,
  getFileInfo
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

// Helper function to resolve association
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

// Helper function to find or create member
async function findOrCreateMember(memberData, transaction = null) {
  let { phone, name, email, businessName, businessType, city, associationId, profileImage } = memberData;

  // Normalize businessType: convert 'madap' to 'mandap' (common typo from frontend)
  if (businessType === 'madap') {
    businessType = 'mandap';
    console.log('🔄 Normalized businessType from "madap" to "mandap"');
  }

  // Validate phone format
  if (!phone || !/^[0-9]{10}$/.test(phone)) {
    throw new Error('Phone number must be exactly 10 digits');
  }

  // Validate required fields
  if (!name || name.trim().length < 2) {
    throw new Error('Name must be at least 2 characters');
  }

  if (!businessName || businessName.trim().length < 2) {
    throw new Error('Business name must be at least 2 characters');
  }

  // businessType is now optional, so no validation needed

  // Check if member exists
  let member = await Member.findOne({
    where: { phone },
    transaction
  });

  if (member) {
    const updates = {};
    if (profileImage && !member.profileImage) {
      updates.profileImage = profileImage;
    }

    try {
      const association = await resolveAssociation(associationId || member.associationId, transaction);
      if (association?.id) {
        if (!member.associationId || (associationId && member.associationId !== association.id)) {
          updates.associationId = association.id;
        }
        if (!member.associationName || updates.associationId) {
          updates.associationName = association.name;
        }
      }

      if (Object.keys(updates).length > 0) {
        await member.update(updates, { transaction });
      }
    } catch (updateError) {
      console.error('❌ Error updating existing member:', updateError);
    }

    return { member, isNew: false };
  }

  // Create new member
  try {
    const association = await resolveAssociation(associationId, transaction);
    if (!association || !association.id) {
      throw new Error('Failed to resolve association');
    }

    const associationName = association.name;

    // Double-check for duplicates
    const duplicateCheck = await Member.findOne({
      where: { phone },
      transaction
    });

    if (duplicateCheck) {
      return { member: duplicateCheck, isNew: false };
    }

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

    return { member, isNew: true };

  } catch (createError) {
    if (createError.name === 'SequelizeUniqueConstraintError' || createError.message?.includes('unique')) {
      const existingMember = await Member.findOne({
        where: { phone },
        transaction
      });
      if (existingMember) {
        return { member: existingMember, isNew: false };
      }
    }

    throw new Error(`Failed to create member: ${createError.message}`);
  }
}

// Note: Public routes don't need authentication
// Authentication is applied individually to protected routes

// @desc    Get all events with filtering and pagination
// @route   GET /api/events
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().trim(),
  query('type').optional().isString().trim(),
  query('status').optional().isIn(['Upcoming', 'Ongoing', 'Completed', 'Cancelled', 'Postponed']),
  query('priority').optional().isIn(['Low', 'Medium', 'High', 'Urgent']),
  query('city').optional().isString().trim(),
  query('district').optional().isString().trim(),
  query('dateFrom').optional().isISO8601().withMessage('Invalid date format'),
  query('dateTo').optional().isISO8601().withMessage('Invalid date format'),
  query('sortBy').optional().isIn(['title', 'date', 'priority', 'created_at']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const {
      page = 1,
      limit = 10,
      search,
      type,
      status,
      priority,
      city,
      district,
      dateFrom,
      dateTo,
      sortBy = 'date',
      sortOrder = 'asc'
    } = req.query;

    // Build filter object
    const where = {};

    // Note: Public route - no user-based filtering

    // Apply search filters
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { city: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (city) {
      where.city = city;
    }

    if (district) {
      where.district = district;
    }

    // Date range filtering
    if (dateFrom || dateTo) {
      where.startDate = {};
      if (dateFrom) {
        where.startDate[Op.gte] = new Date(dateFrom);
      }
      if (dateTo) {
        where.startDate[Op.lte] = new Date(dateTo);
      }
    }

    // Build sort object
    const order = [];
    if (sortBy === 'date') {
      order.push(['startDate', sortOrder.toUpperCase()]);
    } else {
      order.push([sortBy, sortOrder.toUpperCase()]);
    }

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const { count, rows: events } = await Event.findAndCountAll({
      where,
      include: [
        { model: User, as: 'createdByUser', attributes: ['name', 'email'] },
        { model: User, as: 'updatedByUser', attributes: ['name', 'email'] }
      ],
      order,
      offset,
      limit: parseInt(limit)
    });

    const total = count;

    // Calculate pagination info
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Transform image field to include full URL for all events
    events.forEach(event => {
      if (event.image) {
        const baseUrl = req.protocol + '://' + req.get('host');
        // Check if image is already a full URL (Cloudinary or other external URL)
        if (event.image.startsWith('http://') || event.image.startsWith('https://')) {
          event.imageURL = event.image;
        } else {
          // Legacy local file - generate URL and check if file exists
          // If file doesn't exist, set imageURL to null (frontend will handle gracefully)
          event.imageURL = getFileUrl(event.image, baseUrl, 'event-images', true);
          // If imageURL is null, also set image to null to indicate missing file
          if (!event.imageURL) {
            console.warn(`Event ${event.id}: Image file not found: ${event.image}`);
            event.image = null; // Clear the image field if file doesn't exist
          }
        }
      } else {
        event.imageURL = null;
      }
    });

    res.status(200).json({
      success: true,
      count: events.length,
      total,
      page: parseInt(page),
      totalPages,
      hasNextPage,
      hasPrevPage,
      events
    });

  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching events'
    });
  }
});

// @desc    Get upcoming events
// @route   GET /api/events/upcoming
// @access  Public
router.get('/upcoming', async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    // Build filter for upcoming events
    const where = {
      startDate: { [Op.gte]: new Date() },
      status: { [Op.in]: ['Upcoming', 'Ongoing'] },
      isPublic: true,
      isActive: true
    };

    const upcomingEvents = await Event.findAll({
      where,
      include: [
        { model: User, as: 'createdByUser', attributes: ['name', 'email'] },
        { model: User, as: 'updatedByUser', attributes: ['name', 'email'] }
      ],
      order: [['startDate', 'ASC']],
      limit: parseInt(limit)
    });

    // Transform image field to include full URL for all events
    upcomingEvents.forEach(event => {
      if (event.image) {
        const baseUrl = req.protocol + '://' + req.get('host');
        // Check if image is already a full URL (Cloudinary or other external URL)
        if (event.image.startsWith('http://') || event.image.startsWith('https://')) {
          event.imageURL = event.image;
        } else {
          // Legacy local file - generate URL and check if file exists
          event.imageURL = getFileUrl(event.image, baseUrl, 'event-images', true);
          if (!event.imageURL) {
            console.warn(`Upcoming Event ${event.id}: Image file not found: ${event.image}`);
            event.image = null;
            event.imageURL = null;
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      count: upcomingEvents.length,
      events: upcomingEvents
    });

  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching upcoming events'
    });
  }
});

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Public (admins can see all, public users see only active/public)
router.get('/:id', async (req, res) => {
  try {
    // Build where clause - admins can see all events, public users see only active/public
    const whereClause = { id: req.params.id };
    if (!req.user || req.user.role !== 'admin') {
      whereClause.isPublic = true;
      whereClause.isActive = true;
    }

    const event = await Event.findOne({
      where: whereClause,
      include: [
        { model: User, as: 'createdByUser', attributes: ['name', 'email'] },
        { model: User, as: 'updatedByUser', attributes: ['name', 'email'] }
      ]
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found or not accessible'
      });
    }

    // Transform image field to include full URL if image exists
    if (event.image) {
      const baseUrl = req.protocol + '://' + req.get('host');
      // Check if image is already a full URL (Cloudinary or other external URL)
      if (event.image.startsWith('http://') || event.image.startsWith('https://')) {
        event.imageURL = event.image;
      } else {
        // Legacy local file - generate URL and check if file exists
        event.imageURL = getFileUrl(event.image, baseUrl, 'event-images', true);
        // If file doesn't exist, set imageURL to null
        if (!event.imageURL) {
          console.warn(`Event ${event.id}: Image file not found: ${event.image}`);
          event.image = null; // Clear the image field if file doesn't exist
          event.imageURL = null;
        }
      }
    } else {
      event.imageURL = null;
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

// @desc    Create new event
// @route   POST /api/events
// @access  Private
router.post('/', protect, [
  body('title').optional().trim(),
  body('name').optional().trim(), // Accept 'name' as alias for 'title'
  body('description').optional().trim(),
  body('type').optional().isIn([
    'Meeting', 'Workshop', 'Seminar', 'Celebration', 'Other'
  ]),
  body('fee').optional().isFloat({ min: 0 }), // Accept 'fee' as alias for 'registrationFee'
  body('startDateTime').optional().custom((value) => {
    // Accept ISO8601 or formats like "2025-11-01T12:52"
    if (typeof value === 'string' && (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/) || !isNaN(Date.parse(value)))) {
      return true;
    }
    throw new Error('Invalid startDateTime format');
  }), // Accept combined date-time
  body('endDateTime').optional().custom((value) => {
    // Accept ISO8601 or formats like "2025-11-01T12:52"
    if (typeof value === 'string' && (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/) || !isNaN(Date.parse(value)))) {
      return true;
    }
    throw new Error('Invalid endDateTime format');
  }), // Accept combined date-time
  body('startDate').optional(),
  body('endDate').optional(),
  body('startTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('endTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('location').optional().trim(),
  body('address').optional().trim(),
  body('city').optional().trim(),
  body('district').optional().trim(),
  body('state').optional().trim(),
  body('pincode').optional().matches(/^[0-9]{6}$/),
  body('organizer').optional().trim(),
  body('contactPerson').optional(),
  body('contactPerson.name').optional().trim(),
  body('contactPerson.phone').optional().matches(/^[0-9]{10}$/),
  body('contactPerson.email').optional().isEmail(),
  body('contactPhone').optional().matches(/^[0-9+\-\s()]+$/),
  body('contactEmail').optional().isEmail(),
  body('priority').optional().isIn(['Low', 'Medium', 'High', 'Urgent']),
  body('targetAudience').optional().isArray(),
  body('maxAttendees').optional(),
  body('registrationRequired').optional().isBoolean(),
  body('registrationFee').optional().isFloat({ min: 0 }),
  body('isActive').optional().isBoolean(),
  body('isPublic').optional().isBoolean(),
  body('image').optional().isURL().withMessage('Image must be a valid URL'), // Accept Cloudinary URL
  body('imageURL').optional().isURL().withMessage('Image URL must be a valid URL'), // Accept Cloudinary URL as imageURL
], authorizeDistrict, async (req, res) => {
  try {
    // Check for validation errors first
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Validate required fields after normalization
    const title = (req.body.title || req.body.name || '').trim();
    if (!title || title.length < 2) {
      return res.status(400).json({
        success: false,
        errors: [{ msg: 'Event title is required and must be at least 2 characters (provide title or name)', param: 'title' }]
      });
    }

    if (!req.body.startDate && !req.body.startDateTime) {
      return res.status(400).json({
        success: false,
        errors: [{ msg: 'Event start date is required (provide startDate or startDateTime)', param: 'startDate' }]
      });
    }

    // Normalize frontend field names to backend format
    if (req.body.name && !req.body.title) {
      req.body.title = req.body.name;
    }
    if (req.body.fee !== undefined && req.body.registrationFee === undefined) {
      req.body.registrationFee = req.body.fee;
    }

    // Handle startDateTime/endDateTime format from frontend
    if (req.body.startDateTime && !req.body.startDate) {
      // Handle formats like "2025-11-01T12:52" or full ISO
      let dtStr = req.body.startDateTime;
      if (dtStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
        // Format: YYYY-MM-DDTHH:MM - add seconds and treat as UTC
        dtStr = dtStr + ':00Z'; // Add Z to treat as UTC
      }
      const dt = new Date(dtStr);
      if (!isNaN(dt.getTime())) {
        req.body.startDate = dt.toISOString().split('T')[0];
        // Use UTC methods to preserve exact time
        const hours = String(dt.getUTCHours()).padStart(2, '0');
        const minutes = String(dt.getUTCMinutes()).padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;
        if (timeStr !== '00:00') {
          req.body.startTime = timeStr;
        }
      }
    }
    if (req.body.endDateTime && !req.body.endDate) {
      // Handle formats like "2025-11-01T12:52" or full ISO
      let dtStr = req.body.endDateTime;
      if (dtStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
        // Format: YYYY-MM-DDTHH:MM - add seconds and treat as UTC
        dtStr = dtStr + ':00Z'; // Add Z to treat as UTC
      }
      const dt = new Date(dtStr);
      if (!isNaN(dt.getTime())) {
        req.body.endDate = dt.toISOString().split('T')[0];
        // Use UTC methods to preserve exact time
        const hours = String(dt.getUTCHours()).padStart(2, '0');
        const minutes = String(dt.getUTCMinutes()).padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;
        if (timeStr !== '00:00') {
          req.body.endTime = timeStr;
        }
      }
    }

    // Set default type if missing
    if (!req.body.type) {
      req.body.type = 'Other';
    }

    // Handle date and time conversion
    let startDate, endDate;

    if (req.body.startDate) {
      // If startTime is provided, combine date and time
      if (req.body.startTime) {
        startDate = new Date(`${req.body.startDate}T${req.body.startTime}:00`);
      } else {
        startDate = new Date(req.body.startDate);
      }
    }

    if (req.body.endDate) {
      // If endTime is provided, combine date and time
      if (req.body.endTime) {
        endDate = new Date(`${req.body.endDate}T${req.body.endTime}:00`);
      } else {
        endDate = new Date(req.body.endDate);
      }
    }

    // If no endDate but endTime is provided, use startDate with endTime
    if (!endDate && req.body.endTime && startDate) {
      const startDateStr = startDate.toISOString().split('T')[0];
      endDate = new Date(`${startDateStr}T${req.body.endTime}:00`);
    }

    if (endDate && startDate && endDate < startDate) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    // Handle contact person data (nested or flat)
    let contactPerson, contactPhone, contactEmail;
    if (req.body.contactPerson && typeof req.body.contactPerson === 'object') {
      contactPerson = req.body.contactPerson.name;
      contactPhone = req.body.contactPerson.phone;
      contactEmail = req.body.contactPerson.email;
    } else {
      contactPerson = req.body.contactPerson;
      contactPhone = req.body.contactPhone;
      contactEmail = req.body.contactEmail;
    }

    // Handle maxAttendees conversion
    let maxAttendees = req.body.maxAttendees;
    if (typeof maxAttendees === 'string') {
      maxAttendees = parseInt(maxAttendees);
    }

    // Handle event image URL (Cloudinary)
    // Accept both 'image' and 'imageURL' fields, prioritize 'imageURL'
    let imageUrl = null;
    if (req.body.imageURL) {
      imageUrl = req.body.imageURL.trim();
    } else if (req.body.image) {
      imageUrl = req.body.image.trim();
    }

    const baseUrl = req.protocol + '://' + req.get('host');
    if (imageUrl) {
      console.log('Event image URL received:', imageUrl);
    }

    // Prepare event data
    const eventData = {
      title: req.body.title,
      description: req.body.description,
      type: req.body.type,
      startDate: startDate,
      endDate: endDate,
      location: req.body.location,
      address: req.body.address,
      city: req.body.city,
      district: req.body.district,
      state: req.body.state,
      pincode: req.body.pincode,
      contactPerson: contactPerson,
      contactPhone: contactPhone,
      contactEmail: contactEmail,
      maxAttendees: maxAttendees,
      registrationFee: req.body.registrationFee,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      isPublic: req.body.isPublic !== undefined ? req.body.isPublic : true,
      image: imageUrl || null,
      createdBy: req.user.id,
      updatedBy: req.user.id,
      status: 'Upcoming',
      priority: req.body.priority || 'Medium'
    };

    // Create event
    const event = await Event.create(eventData);

    // Get event with populated fields
    const eventWithDetails = await Event.findByPk(event.id, {
      include: [
        { model: User, as: 'createdByUser', attributes: ['name', 'email'] }
      ]
    });

    // Transform image field - if it's a Cloudinary URL, use it directly
    // Otherwise, generate URL using getFileUrl helper (for backward compatibility)
    const eventResponse = eventWithDetails.toJSON();
    if (eventResponse.image) {
      // Check if image is already a full URL (Cloudinary or other external URL)
      if (eventResponse.image.startsWith('http://') || eventResponse.image.startsWith('https://')) {
        eventResponse.imageURL = eventResponse.image;
      } else {
        // Legacy local file - generate URL
        eventResponse.imageURL = getFileUrl(eventResponse.image, baseUrl, 'event-images');
      }
    }

    // Send notification for new event
    try {
      const notification = {
        title: `New Event: ${eventWithDetails.title}`,
        body: `${eventWithDetails.type} on ${new Date(eventWithDetails.startDate).toLocaleDateString()} at ${eventWithDetails.location || eventWithDetails.city}`,
        type: 'event',
        data: {
          type: 'event',
          eventId: eventWithDetails.id.toString(),
          action: 'view_event'
        },
        eventId: eventWithDetails.id
      };

      // Send to members (mobile app users) when admin creates event
      await fcmService.sendNotificationToAllUsers(notification, 'member');
      console.log(`✅ Event notification sent for event: ${eventWithDetails.title}`);
    } catch (notificationError) {
      console.error('❌ Error sending event notification:', notificationError);
      // Don't fail the event creation if notification fails
    }

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event: eventResponse,
      uploadedFiles: {
        image: imageUrl ? {
          url: imageUrl
        } : null
      }
    });

  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating event'
    });
  }
});

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private
router.put('/:id', protect, [
  body('title').optional().notEmpty().trim().withMessage('Title cannot be empty'),
  body('name').optional().trim(), // Accept 'name' as alias for 'title'
  body('description').optional().trim(),
  body('type').optional().isIn([
    'Meeting', 'Workshop', 'Seminar', 'Celebration', 'Other'
  ]),
  body('fee').optional().isFloat({ min: 0 }), // Accept 'fee' as alias for 'registrationFee'
  body('startDateTime').optional().custom((value) => {
    // Accept ISO8601 or formats like "2025-11-01T12:52"
    if (typeof value === 'string' && (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/) || !isNaN(Date.parse(value)))) {
      return true;
    }
    throw new Error('Invalid startDateTime format');
  }),
  body('endDateTime').optional().custom((value) => {
    // Accept ISO8601 or formats like "2025-11-01T12:52"
    if (typeof value === 'string' && (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/) || !isNaN(Date.parse(value)))) {
      return true;
    }
    throw new Error('Invalid endDateTime format');
  }),
  body('startDate').optional(),
  body('endDate').optional(),
  body('startTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('endTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('location').optional().trim(),
  body('address').optional().trim(),
  body('city').optional().trim(),
  body('state').optional().trim(),
  body('pincode').optional().matches(/^[0-9]{6}$/).withMessage('Invalid pincode'),
  body('contactPerson').optional().trim(),
  body('contactPhone').optional().matches(/^[0-9+\-\s()]+$/).withMessage('Invalid phone number'),
  body('contactEmail').optional().isEmail().withMessage('Invalid email format'),
  body('maxAttendees').optional().isInt({ min: 1 }).withMessage('Max attendees must be at least 1'),
  body('registrationFee').optional().isFloat({ min: 0 }).withMessage('Registration fee must be non-negative'),
  body('isActive').optional().isBoolean(),
  body('isPublic').optional().isBoolean(),
  body('image').optional().isURL().withMessage('Image must be a valid URL'), // Accept Cloudinary URL
  body('imageURL').optional().isURL().withMessage('Image URL must be a valid URL'), // Accept Cloudinary URL as imageURL
], authorizeDistrict, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Find event first to check access
    const existingEvent = await Event.findByPk(req.params.id);
    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check district access for sub-admins and managers
    if (['manager', 'sub-admin'].includes(req.user.role) && existingEvent.district !== req.user.district) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to event in different district'
      });
    }

    // Normalize frontend field names to backend format
    if (req.body.name && !req.body.title) {
      req.body.title = req.body.name;
    }
    if (req.body.fee !== undefined && req.body.registrationFee === undefined) {
      req.body.registrationFee = req.body.fee;
    }

    // Handle image URL from Cloudinary
    // Accept both 'image' and 'imageURL' fields, prioritize 'imageURL'
    let imageUrl = null;
    if (req.body.imageURL) {
      imageUrl = req.body.imageURL.trim();
    } else if (req.body.image) {
      imageUrl = req.body.image.trim();
    }

    // Handle startDateTime/endDateTime format from frontend
    if (req.body.startDateTime && !req.body.startDate) {
      // Handle formats like "2025-11-01T12:52" or full ISO
      let dtStr = req.body.startDateTime;
      if (dtStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
        // Format: YYYY-MM-DDTHH:MM - add seconds and treat as UTC
        dtStr = dtStr + ':00Z'; // Add Z to treat as UTC
      }
      const dt = new Date(dtStr);
      if (!isNaN(dt.getTime())) {
        req.body.startDate = dt.toISOString().split('T')[0];
        // Use UTC methods to preserve exact time
        const hours = String(dt.getUTCHours()).padStart(2, '0');
        const minutes = String(dt.getUTCMinutes()).padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;
        if (timeStr !== '00:00') {
          req.body.startTime = timeStr;
        }
      }
    }
    if (req.body.endDateTime && !req.body.endDate) {
      // Handle formats like "2025-11-01T12:52" or full ISO
      let dtStr = req.body.endDateTime;
      if (dtStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
        // Format: YYYY-MM-DDTHH:MM - add seconds and treat as UTC
        dtStr = dtStr + ':00Z'; // Add Z to treat as UTC
      }
      const dt = new Date(dtStr);
      if (!isNaN(dt.getTime())) {
        req.body.endDate = dt.toISOString().split('T')[0];
        // Use UTC methods to preserve exact time
        const hours = String(dt.getUTCHours()).padStart(2, '0');
        const minutes = String(dt.getUTCMinutes()).padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;
        if (timeStr !== '00:00') {
          req.body.endTime = timeStr;
        }
      }
    }

    // Handle date and time conversion
    let startDate, endDate;

    if (req.body.startDate !== undefined) {
      // If startTime is provided, combine date and time
      if (req.body.startTime) {
        startDate = new Date(`${req.body.startDate}T${req.body.startTime}:00`);
      } else if (existingEvent.startDate) {
        // If updating date but not time, preserve existing time
        const existingStart = new Date(existingEvent.startDate);
        const timeStr = existingStart.toTimeString().split(' ')[0].slice(0, 5); // HH:MM
        if (timeStr !== '00:00') {
          startDate = new Date(`${req.body.startDate}T${timeStr}:00`);
        } else {
          startDate = new Date(req.body.startDate);
        }
      } else {
        startDate = new Date(req.body.startDate);
      }
    } else if (req.body.startTime !== undefined) {
      // If only time is being updated, use existing date with new time
      if (existingEvent.startDate) {
        const existingStart = new Date(existingEvent.startDate);
        const dateStr = existingStart.toISOString().split('T')[0];
        startDate = new Date(`${dateStr}T${req.body.startTime}:00`);
      }
    }

    if (req.body.endDate !== undefined) {
      // If endTime is provided, combine date and time
      if (req.body.endTime) {
        endDate = new Date(`${req.body.endDate}T${req.body.endTime}:00`);
      } else if (existingEvent.endDate) {
        // If updating date but not time, preserve existing time
        const existingEnd = new Date(existingEvent.endDate);
        const timeStr = existingEnd.toTimeString().split(' ')[0].slice(0, 5); // HH:MM
        if (timeStr !== '00:00') {
          endDate = new Date(`${req.body.endDate}T${timeStr}:00`);
        } else {
          endDate = new Date(req.body.endDate);
        }
      } else {
        endDate = new Date(req.body.endDate);
      }
    } else if (req.body.endTime !== undefined) {
      // If only time is being updated, use existing date with new time
      if (existingEvent.endDate) {
        const existingEnd = new Date(existingEvent.endDate);
        const dateStr = existingEnd.toISOString().split('T')[0];
        endDate = new Date(`${dateStr}T${req.body.endTime}:00`);
      } else if (startDate) {
        // If no endDate but endTime is provided, use startDate with endTime
        const startDateStr = startDate.toISOString().split('T')[0];
        endDate = new Date(`${startDateStr}T${req.body.endTime}:00`);
      }
    }

    // Validate date logic if both dates are provided
    if (startDate && endDate && endDate < startDate) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    // Handle event image URL (Cloudinary)
    const baseUrl = req.protocol + '://' + req.get('host');
    if (imageUrl) {
      console.log('📸 New image URL received:', imageUrl);
      console.log('📸 Old image URL:', existingEvent.image);

      // If old image is a local file (not Cloudinary URL), delete it
      // Cloudinary URLs typically contain 'cloudinary.com' or 'res.cloudinary.com'
      if (existingEvent.image && !existingEvent.image.includes('cloudinary.com') && !existingEvent.image.includes('http')) {
        try {
          await deleteFile(existingEvent.image);
          console.log('✅ Old local image deleted successfully');
        } catch (error) {
          console.log('⚠️ Could not delete old event image:', error.message);
        }
      }
    }

    // Prepare update data - only include fields that are being updated
    const updateData = {
      updatedBy: req.user.id
    };

    // Only update fields that are provided
    if (req.body.title !== undefined) updateData.title = req.body.title;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.type !== undefined) updateData.type = req.body.type;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (endDate !== undefined) updateData.endDate = endDate;
    if (req.body.location !== undefined) updateData.location = req.body.location;
    if (req.body.address !== undefined) updateData.address = req.body.address;
    if (req.body.city !== undefined) updateData.city = req.body.city;
    if (req.body.district !== undefined) updateData.district = req.body.district;
    if (req.body.state !== undefined) updateData.state = req.body.state;
    if (req.body.pincode !== undefined) updateData.pincode = req.body.pincode;
    if (req.body.contactPerson !== undefined) updateData.contactPerson = req.body.contactPerson;
    if (req.body.contactPhone !== undefined) updateData.contactPhone = req.body.contactPhone;
    if (req.body.contactEmail !== undefined) updateData.contactEmail = req.body.contactEmail;
    if (req.body.maxAttendees !== undefined) updateData.maxAttendees = req.body.maxAttendees;
    if (req.body.registrationFee !== undefined) updateData.registrationFee = req.body.registrationFee;
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
    if (req.body.isPublic !== undefined) updateData.isPublic = req.body.isPublic;

    // Handle image field - accept Cloudinary URL
    if (imageUrl !== null) {
      updateData.image = imageUrl;
    }

    // Update event
    await existingEvent.update(updateData);

    // Get updated event with populated fields
    const event = await Event.findByPk(req.params.id, {
      include: [
        { model: User, as: 'createdByUser', attributes: ['name', 'email'] },
        { model: User, as: 'updatedByUser', attributes: ['name', 'email'] }
      ]
    });

    // Transform image field - if it's a Cloudinary URL, use it directly
    // Otherwise, generate URL using getFileUrl helper (for backward compatibility)
    const eventResponse = event.toJSON();
    if (eventResponse.image) {
      // Check if image is already a full URL (Cloudinary or other external URL)
      if (eventResponse.image.startsWith('http://') || eventResponse.image.startsWith('https://')) {
        eventResponse.imageURL = eventResponse.image;
      } else {
        // Legacy local file - generate URL and check if file exists
        eventResponse.imageURL = getFileUrl(eventResponse.image, baseUrl, 'event-images', true);
        if (!eventResponse.imageURL) {
          console.warn(`Event ${eventResponse.id}: Image file not found: ${eventResponse.image}`);
          eventResponse.image = null;
          eventResponse.imageURL = null;
        }
      }
      console.log('📸 Generated image URL:', eventResponse.imageURL);
    } else {
      eventResponse.imageURL = null;
    }

    // Send notification for event update
    try {
      const notification = {
        title: `Event Updated: ${event.title}`,
        body: `Event details have been updated. Check for changes in time, location, or other details.`,
        type: 'event',
        data: {
          type: 'event',
          eventId: event.id.toString(),
          action: 'view_event'
        },
        eventId: event.id
      };

      // Send to members (mobile app users) when admin updates event
      await fcmService.sendNotificationToAllUsers(notification, 'member');
      console.log(`✅ Event update notification sent for event: ${event.title}`);
    } catch (notificationError) {
      console.error('❌ Error sending event update notification:', notificationError);
      // Don't fail the event update if notification fails
    }

    res.status(200).json({
      success: true,
      message: 'Event updated successfully',
      event: eventResponse,
      uploadedFiles: {
        image: imageUrl ? {
          url: imageUrl
        } : null
      }
    });

  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating event'
    });
  }
});

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private
router.delete('/:id', protect, async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check district access for sub-admins and managers
    if (['manager', 'sub-admin'].includes(req.user.role) && event.district !== req.user.district) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to event in different district'
      });
    }

    await event.destroy();

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting event'
    });
  }
});

// @desc    Get event statistics
// @route   GET /api/events/stats/overview
// @access  Private
router.get('/stats/overview', async (req, res) => {
  try {
    // Build filter for district-based access
    const where = {};
    if (['manager', 'sub-admin'].includes(req.user.role)) {
      where.district = req.user.district;
    }

    // Get counts
    const totalEvents = await Event.count({ where });
    const upcomingEvents = await Event.count({
      where: {
        ...where,
        startDate: { [Op.gte]: new Date() },
        status: { [Op.in]: ['Upcoming', 'Ongoing'] }
      }
    });
    const completedEvents = await Event.count({
      where: { ...where, status: 'Completed' }
    });
    const cancelledEvents = await Event.count({
      where: { ...where, status: { [Op.in]: ['Cancelled', 'Postponed'] } }
    });

    // Get type distribution
    const typeStats = await Event.findAll({
      where,
      attributes: [
        'type',
        [Event.sequelize.fn('COUNT', Event.sequelize.col('id')), 'count']
      ],
      group: ['type'],
      order: [[Event.sequelize.fn('COUNT', Event.sequelize.col('id')), 'DESC']],
      raw: true
    });

    // Get priority distribution
    const priorityStats = await Event.findAll({
      where,
      attributes: [
        'priority',
        [Event.sequelize.fn('COUNT', Event.sequelize.col('id')), 'count']
      ],
      group: ['priority'],
      order: [[Event.sequelize.fn('COUNT', Event.sequelize.col('id')), 'DESC']],
      raw: true
    });

    // Get monthly event count for current year
    const currentYear = new Date().getFullYear();
    const monthlyStats = await Event.findAll({
      where: {
        ...where,
        startDate: { [Op.gte]: new Date(currentYear, 0, 1) }
      },
      attributes: [
        [Event.sequelize.fn('EXTRACT', Event.sequelize.literal('MONTH FROM start_date')), 'month'],
        [Event.sequelize.fn('COUNT', Event.sequelize.col('id')), 'count']
      ],
      group: [Event.sequelize.fn('EXTRACT', Event.sequelize.literal('MONTH FROM start_date'))],
      order: [[Event.sequelize.fn('EXTRACT', Event.sequelize.literal('MONTH FROM start_date')), 'ASC']],
      raw: true
    });

    res.status(200).json({
      success: true,
      stats: {
        total: totalEvents,
        upcoming: upcomingEvents,
        completed: completedEvents,
        cancelled: cancelledEvents,
        types: typeStats,
        priorities: priorityStats,
        monthly: monthlyStats
      }
    });

  } catch (error) {
    console.error('Get event stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching event statistics'
    });
  }
});

// @desc    Update event status
// @route   PUT /api/events/:id/status
// @access  Private
router.put('/:id/status', protect, [
  body('status', 'Status is required').isIn(['Upcoming', 'Ongoing', 'Completed', 'Cancelled', 'Postponed'])
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { status } = req.body;

    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check district access for sub-admins and managers
    if (['manager', 'sub-admin'].includes(req.user.role) && event.district !== req.user.district) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to event in different district'
      });
    }

    // Update status
    await event.update({
      status: status,
      updatedBy: req.user.id
    });

    res.status(200).json({
      success: true,
      event,
      message: `Event status updated to ${status}`
    });

  } catch (error) {
    console.error('Update event status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating event status'
    });
  }
});

// @desc    Get registrations for an event
// @route   GET /api/events/:id/registrations
// @access  Private (admin)
router.get('/:id/registrations', protect, async (req, res) => {
  try {
    const eventId = req.params.id;
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const regs = await EventRegistration.findAll({
      where: { eventId },
      include: [
        {
          model: Member,
          as: 'member',
          attributes: [
            'id',
            'name',
            'phone',
            'email',
            'businessName',
            'businessType',
            'city',
            'associationName',
            'profileImage'
          ]
        }
      ],
      order: [['registeredAt', 'DESC']]
    });

    const baseUrl = req.protocol + '://' + req.get('host');

    const list = regs.map((registration) => {
      const memberInstance = registration.member;
      const memberData = memberInstance
        ? memberInstance.toJSON
          ? memberInstance.toJSON()
          : { ...memberInstance }
        : null;

      const baseProfileSource =
        memberData?.profileImageURL ||
        memberData?.profileImage ||
        registration.profileImageURL ||
        registration.profileImage ||
        null;

      const profileMeta = ensureProfileImageUrl(baseProfileSource, baseUrl);
      const normalizedProfileUrl = profileMeta.url;

      const fullMember = memberData
        ? {
          ...memberData,
          profileImage: profileMeta.stored || memberData.profileImage || memberData.profileImageURL || null,
          profileImageURL: normalizedProfileUrl || memberData.profileImageURL || memberData.profileImage || null
        }
        : null;

      const effectiveProfileUrl =
        normalizedProfileUrl ||
        fullMember?.profileImageURL ||
        fullMember?.profileImage ||
        null;

      return {
        registrationId: registration.id,
        eventId: registration.eventId,
        memberId: registration.memberId,
        name: fullMember?.name || memberInstance?.name || registration.memberName || 'Guest',
        phone: fullMember?.phone || memberInstance?.phone || registration.memberPhone || null,
        email: fullMember?.email || null,
        businessName: fullMember?.businessName || null,
        businessType: fullMember?.businessType || null,
        city: fullMember?.city || null,
        amountPaid: registration.amountPaid,
        paymentStatus: registration.paymentStatus,
        status: registration.status,
        registeredAt: registration.registeredAt,
        attendedAt: registration.attendedAt,
        cancelledAt: registration.cancelledAt,
        profileImage: effectiveProfileUrl,
        profileImageURL: effectiveProfileUrl,
        photo: effectiveProfileUrl,
        member: fullMember
      };
    });

    res.json({ success: true, registrations: list });
  } catch (error) {
    console.error('Get registrations error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching registrations' });
  }
});

// Web Frontend Registration Endpoints
// @desc    Create Razorpay order for event registration (Web)
// @route   POST /api/events/:id/register-payment
// @access  Private (web users)
router.post('/:id/register-payment', protect, [
  body('memberId').optional().isInt().withMessage('memberId must be a valid integer')
], async (req, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const { memberId } = req.body;

    if (isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID'
      });
    }

    const event = await Event.findOne({
      where: { id: eventId }
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
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

    const fee = Number(event.registrationFee || 0);

    // If event is free, return success without payment
    if (!(fee > 0)) {
      return res.status(200).json({
        success: true,
        isFree: true,
        message: 'This event is free. Please use the RSVP endpoint to register.',
        event: {
          id: event.id,
          title: event.title,
          registrationFee: 0
        }
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

    // Determine member ID
    let targetMemberId = memberId;

    // If admin is registering someone else, use provided memberId
    if (memberId && req.user.role === 'admin') {
      const member = await Member.findByPk(memberId);
      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found'
        });
      }
      targetMemberId = memberId;
    } else {
      // User registering themselves - find member by phone
      if (!req.user.phone) {
        return res.status(400).json({
          success: false,
          message: 'Please add a phone number to your profile to register for events'
        });
      }

      // Find member by phone
      let member = await Member.findOne({
        where: { phone: req.user.phone }
      });

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member profile not found. Please ensure your phone number matches a member record.',
          suggestion: 'Contact administrator to link your user account with a member profile'
        });
      }

      targetMemberId = member.id;
    }

    // Check if already registered
    const existingRegistration = await EventRegistration.findOne({
      where: { eventId, memberId: targetMemberId }
    });

    if (existingRegistration && existingRegistration.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'Already registered and paid for this event'
      });
    }

    // Get member details for prefill
    const member = await Member.findByPk(targetMemberId);

    const order = await paymentService.createOrder(fee, `evt_${eventId}_mem_${targetMemberId}_${Date.now()}`);

    // Prepare payment options for frontend (Razorpay Checkout)
    const paymentOptions = {
      key: process.env.RAZORPAY_KEY_ID,
      amount: order.amount, // Already in paise
      currency: 'INR',
      name: event.title || 'Event Registration',
      description: `Event Registration Fee - ${event.title || 'Event'}`,
      order_id: order.id,
      prefill: {
        name: member?.name || '',
        email: member?.email || '',
        contact: member?.phone || ''
      },
      theme: {
        color: '#2563eb' // Blue theme
      },
      notes: {
        eventId: eventId.toString(),
        memberId: targetMemberId.toString(),
        eventName: event.title
      }
    };

    return res.status(201).json({
      success: true,
      isFree: false,
      order,
      keyId: process.env.RAZORPAY_KEY_ID,
      paymentOptions // Provide pre-configured options
    });
  } catch (error) {
    console.error('Create order error:', error);
    const errorMessage = error.message || 'Server error while creating order';
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// @desc    Confirm payment and create registration (Web)
// @route   POST /api/events/:id/confirm-payment
// @access  Private (web users)
router.post('/:id/confirm-payment', protect, [
  body('razorpay_order_id', 'Razorpay order ID is required').notEmpty(),
  body('razorpay_payment_id', 'Razorpay payment ID is required').notEmpty(),
  body('razorpay_signature', 'Razorpay signature is required').notEmpty(),
  body('memberId').optional().isInt().withMessage('memberId must be a valid integer')
], async (req, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, notes, memberId } = req.body;

    if (isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID'
      });
    }

    const event = await Event.findOne({
      where: { id: eventId }
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const fee = Number(event.registrationFee || 0);

    // If event is free, use RSVP flow instead
    if (!(fee > 0)) {
      return res.status(400).json({
        success: false,
        message: 'This event is free. Please use the RSVP endpoint to register.',
        useRSVP: true
      });
    }

    // Validate payment fields for paid events
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Payment details are required'
      });
    }

    if (!paymentService.verifySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature })) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment signature'
      });
    }

    // Determine member ID
    let targetMemberId = memberId;
    let memberRecord = null;

    // If admin is registering someone else, use provided memberId
    if (memberId && req.user.role === 'admin') {
      memberRecord = await Member.findByPk(memberId);
      if (!memberRecord) {
        return res.status(404).json({
          success: false,
          message: 'Member not found'
        });
      }
      targetMemberId = memberId;
    } else {
      // User registering themselves - find member by phone
      if (!req.user.phone) {
        return res.status(400).json({
          success: false,
          message: 'Please add a phone number to your profile to register for events'
        });
      }

      // Find member by phone
      memberRecord = await Member.findOne({
        where: { phone: req.user.phone }
      });

      if (!memberRecord) {
        return res.status(404).json({
          success: false,
          message: 'Member profile not found. Please ensure your phone number matches a member record.'
        });
      }

      targetMemberId = memberRecord.id;
    }

    if (!memberRecord) {
      memberRecord = await Member.findByPk(targetMemberId);
    }

    if (!memberRecord) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    const amountPaid = fee;

    // Upsert registration with paid status
    let registration = await EventRegistration.findOne({ where: { eventId, memberId: targetMemberId } });
    const isNewRegistration = !registration;

    if (registration) {
      // Update existing registration
      const wasPaid = registration.paymentStatus === 'paid';
      await registration.update({
        paymentStatus: 'paid',
        amountPaid: amountPaid,
        paymentOrderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        status: 'registered',
        notes: notes || registration.notes,
        registeredAt: registration.registeredAt || new Date()
      });

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
        memberId: targetMemberId,
        status: 'registered',
        paymentStatus: 'paid',
        amountPaid: amountPaid,
        paymentOrderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        notes: notes || null,
        registeredAt: new Date()
      });

      // Update event attendee count for new registration
      await Event.increment('currentAttendees', {
        where: { id: eventId }
      });
    }

    // Generate QR on the fly
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
        memberName: memberRecord.name,
        status: registration.status,
        paymentStatus: registration.paymentStatus,
        amountPaid: registration.amountPaid
      },
      member: {
        id: memberRecord.id,
        name: memberRecord.name,
        phone: memberRecord.phone,
        email: memberRecord.email || null
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

// @desc    Create manual registration with cash payment (Manager)
// @route   POST /api/events/:id/manual-registration
// @access  Private (admin, manager, sub-admin)
router.post('/:id/manual-registration', protect, authorize(['admin', 'manager', 'sub-admin']), [
  body('name', 'Name is required').notEmpty().trim(),
  body('phone', 'Phone number is required').notEmpty().matches(/^[0-9]{10}$/).withMessage('Phone must be 10 digits'),
  body('businessName', 'Business name is required').notEmpty().trim(),
  body('businessType').optional({ checkFalsy: true })
    .customSanitizer((value) => {
      // Normalize 'madap' to 'mandap' (common typo from frontend)
      return value === 'madap' ? 'mandap' : value;
    })
    .isIn(['catering', 'sound', 'mandap', 'light', 'decorator', 'photography', 'videography', 'transport', 'other']),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Email must be valid'),
  body('city').optional({ checkFalsy: true }).trim(),
  body('associationId').optional({ checkFalsy: true }).isInt({ min: 1 }).withMessage('Association ID must be a valid positive integer'),
  body('photo').optional({ checkFalsy: true }).custom((value) => {
    if (!value || value === '' || value === null || value === undefined) return true;
    if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
      return value.length <= 500;
    }
    return false;
  }).withMessage('Photo must be a valid Cloudinary URL'),
  body('cashReceiptNumber').optional({ checkFalsy: true }).trim().isLength({ max: 100 }).withMessage('Cash receipt number must be less than 100 characters')
], async (req, res) => {
  const requestStartTime = new Date();
  Logger.info('Manual Registration: ========== REQUEST START ==========', {
    timestamp: requestStartTime.toISOString(),
    eventId: req.params.id,
    userId: req.user?.id,
    userName: req.user?.name,
    userRole: req.user?.role,
    body: {
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email ? '***' : null,
      businessName: req.body.businessName,
      businessType: req.body.businessType,
      city: req.body.city,
      associationId: req.body.associationId,
      hasPhoto: !!req.body.photo,
      cashReceiptNumber: req.body.cashReceiptNumber ? '***' : null
    }
  });

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      Logger.warn('Manual Registration: Validation failed', { errors: errors.array() });
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const eventId = parseInt(req.params.id, 10);
    const { name, phone, email, businessName, businessType, city, associationId, photo, cashReceiptNumber } = req.body;

    Logger.info('Manual Registration: Request data parsed', {
      eventId,
      name,
      phone,
      email: email ? '***' : null,
      businessName,
      businessType,
      city,
      associationId,
      hasPhoto: !!photo,
      hasCashReceiptNumber: !!cashReceiptNumber
    });

    if (isNaN(eventId)) {
      Logger.error('Manual Registration: Invalid event ID', { eventId: req.params.id });
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID'
      });
    }

    // Get event
    Logger.info('Manual Registration: Fetching event', { eventId });
    const event = await Event.findOne({
      where: { id: eventId }
    });

    if (!event) {
      Logger.error('Manual Registration: Event not found', { eventId });
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    Logger.info('Manual Registration: Event found', {
      eventId: event.id,
      eventTitle: event.title || event.name,
      registrationFee: event.registrationFee
    });

    const fee = Number(event.registrationFee || 0);
    const baseUrl = req.protocol + '://' + req.get('host');

    Logger.info('Manual Registration: Configuration', {
      fee,
      baseUrl
    });

    // Create member and registration in a transaction
    Logger.info('Manual Registration: Starting transaction');
    const registrationTransaction = await sequelize.transaction();

    try {
      // Find or create member
      Logger.info('Manual Registration: Finding or creating member', {
        phone,
        name,
        businessName,
        businessType,
        city: city || null,
        associationId: associationId || null,
        hasPhoto: !!photo
      });

      const memberResult = await findOrCreateMember({
        phone,
        name,
        email,
        businessName,
        businessType,
        city: city || null,
        associationId: associationId || null,
        profileImage: photo || null
      }, registrationTransaction);

      const { member, isNew: isNewMember } = memberResult;

      Logger.info('Manual Registration: Member result', {
        memberId: member.id,
        memberName: member.name,
        memberPhone: member.phone,
        isNewMember,
        hasPhone: !!member.phone,
        phoneValue: member.phone || 'NULL'
      });

      // Check if already registered
      Logger.info('Manual Registration: Checking for existing registration', {
        eventId,
        memberId: member.id
      });

      const existingRegistration = await EventRegistration.findOne({
        where: { eventId, memberId: member.id },
        transaction: registrationTransaction
      });

      if (existingRegistration) {
        Logger.warn('Manual Registration: Member already registered', {
          registrationId: existingRegistration.id,
          eventId,
          memberId: member.id
        });
        await registrationTransaction.rollback();
        return res.status(400).json({
          success: false,
          message: 'Member is already registered for this event',
          registrationId: existingRegistration.id
        });
      }

      Logger.info('Manual Registration: No existing registration found, creating new');

      // Create registration with cash payment
      // Note: paymentMethod column doesn't exist yet - will be added via migration
      Logger.info('Manual Registration: Creating registration', {
        eventId,
        memberId: member.id,
        fee,
        paymentStatus: 'paid'
      });

      const registration = await EventRegistration.create({
        eventId,
        memberId: member.id,
        status: 'registered',
        paymentStatus: 'paid',
        // paymentMethod: 'cash', // Column doesn't exist in DB yet
        amountPaid: fee,
        cashReceiptNumber: cashReceiptNumber || null,
        registeredAt: new Date()
      }, { transaction: registrationTransaction });

      Logger.info('Manual Registration: Registration created', {
        registrationId: registration.id,
        eventId: registration.eventId,
        memberId: registration.memberId,
        paymentStatus: registration.paymentStatus,
        amountPaid: registration.amountPaid,
        cashReceiptNumber: registration.cashReceiptNumber ? '***' : null
      });

      // Update event attendee count
      Logger.info('Manual Registration: Incrementing event attendees', { eventId });
      await Event.increment('currentAttendees', {
        where: { id: eventId },
        transaction: registrationTransaction
      });

      // Commit transaction
      Logger.info('Manual Registration: Committing transaction');
      await registrationTransaction.commit();
      Logger.info('Manual Registration: Transaction committed successfully');

      // Reload member after transaction to ensure fresh data
      Logger.info('Manual Registration: Reloading member after transaction', { memberId: member.id });
      const freshMember = await Member.findByPk(member.id);
      if (!freshMember) {
        Logger.error('Manual Registration: Member not found after transaction commit', { memberId: member.id });
        return res.status(500).json({
          success: false,
          message: 'Failed to retrieve member after registration'
        });
      }

      Logger.info('Manual Registration: Fresh member loaded', {
        memberId: freshMember.id,
        memberName: freshMember.name,
        memberPhone: freshMember.phone,
        hasPhone: !!freshMember.phone,
        phoneType: typeof freshMember.phone,
        phoneLength: freshMember.phone ? freshMember.phone.length : 0,
        phoneValue: freshMember.phone || 'NULL'
      });

      // Generate QR code (outside transaction)
      let qrDataURL = null;
      try {
        qrDataURL = await qrService.generateQrDataURL(registration);
      } catch (qrError) {
        Logger.warn('Manual Registration: QR generation failed (non-critical)', { error: qrError.message });
      }

      // Get profile image URL
      const profileMeta = ensureProfileImageUrl(
        freshMember.profileImageURL || freshMember.profileImage || photo || null,
        baseUrl
      );

      // Automatically trigger WhatsApp sending for new registrations (same as public registration)
      // This runs asynchronously and does NOT block the response
      Logger.info('Manual Registration: Checking auto-send conditions', {
        hasMember: !!freshMember,
        hasPhone: !!(freshMember && freshMember.phone),
        phone: freshMember?.phone || 'N/A',
        registrationId: registration.id
      });

      if (freshMember && freshMember.phone) {
        const autoSendWhatsApp = async () => {
          try {
            Logger.info('Manual Registration: Starting auto-send process', { registrationId: registration.id });

            // Reload registration with associations for PDF generation
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
              Logger.error('Manual Registration: Registration or associations not found for WhatsApp send', {
                registrationId: registration.id,
                hasRegistration: !!registrationForPdf,
                hasMember: !!(registrationForPdf && registrationForPdf.member),
                hasEvent: !!(registrationForPdf && registrationForPdf.event)
              });
              return;
            }

            Logger.info('Manual Registration: Registration loaded with associations', {
              registrationId: registration.id,
              memberPhone: registrationForPdf.member?.phone || 'N/A',
              memberName: registrationForPdf.member?.name || 'N/A',
              eventTitle: registrationForPdf.event?.title || registrationForPdf.event?.name || 'N/A'
            });

            // NOTE: Don't acquire lock here when using queue - the worker will acquire it
            // Only check if already sent to avoid unnecessary processing
            const preCheck = await EventRegistration.findByPk(registration.id, {
              attributes: ['id', 'pdfSentAt']
            });

            if (preCheck && preCheck.pdfSentAt) {
              Logger.info('Manual Registration: WhatsApp already sent, skipping', {
                registrationId: registration.id,
                pdfSentAt: preCheck.pdfSentAt
              });
              return;
            }

            Logger.info('Manual Registration: Pre-check passed, proceeding with WhatsApp send', { registrationId: registration.id });

            // Validate and clean phone number
            Logger.info('Manual Registration: Validating phone number', {
              registrationId: registration.id,
              rawPhone: registrationForPdf.member.phone,
              phoneType: typeof registrationForPdf.member.phone,
              hasPhone: !!registrationForPdf.member.phone
            });

            const phoneRegex = /^[6-9]\d{9}$/;
            // Smart phone cleaning: only strip country code if length confirms it's a prefix
            let cleanPhone = registrationForPdf.member.phone?.trim() || '';
            if (cleanPhone.startsWith('+91') && cleanPhone.length === 13) {
              cleanPhone = cleanPhone.substring(3);
            } else if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
              cleanPhone = cleanPhone.substring(2);
            }

            Logger.info('Manual Registration: Phone number cleaned', {
              registrationId: registration.id,
              rawPhone: registrationForPdf.member.phone,
              cleanPhone,
              cleanPhoneLength: cleanPhone.length,
              matchesRegex: phoneRegex.test(cleanPhone)
            });

            if (!phoneRegex.test(cleanPhone)) {
              Logger.error('Manual Registration: Invalid phone number format', {
                registrationId: registration.id,
                rawPhone: registrationForPdf.member.phone,
                cleanPhone,
                cleanPhoneLength: cleanPhone.length
              });
              await releaseWhatsAppLock(registration.id);
              return;
            }

            const memberName = registrationForPdf.member.name || '';
            const startTime = new Date();
            Logger.info('Manual Registration: Starting WhatsApp send', {
              registrationId: registration.id,
              phone: cleanPhone,
              memberName,
              timestamp: startTime.toISOString()
            });

            // Generate PDF on-demand as buffer
            Logger.info('Manual Registration: Starting PDF generation', {
              registrationId: registration.id,
              eventId: registrationForPdf.event?.id,
              eventTitle: registrationForPdf.event?.title || registrationForPdf.event?.name,
              memberId: registrationForPdf.member?.id,
              memberName: registrationForPdf.member?.name,
              baseUrl
            });

            let pdfBuffer = null;
            try {
              const pdfStartTime = Date.now();
              pdfBuffer = await pdfService.generateVisitorPassPDFAsBuffer(
                registrationForPdf,
                registrationForPdf.event,
                registrationForPdf.member,
                baseUrl
              );
              const pdfTime = Date.now() - pdfStartTime;
              Logger.info('Manual Registration: PDF generated successfully', {
                registrationId: registration.id,
                sizeKB: (pdfBuffer.length / 1024).toFixed(2),
                sizeBytes: pdfBuffer.length,
                durationMs: pdfTime,
                isBuffer: Buffer.isBuffer(pdfBuffer),
                bufferType: typeof pdfBuffer
              });
            } catch (pdfError) {
              Logger.error('Manual Registration: PDF generation failed', pdfError, {
                registrationId: registration.id,
                errorMessage: pdfError.message,
                errorStack: pdfError.stack
              });
              await releaseWhatsAppLock(registration.id);
              return;
            }

            // Use queue if available
            if (whatsappQueue && typeof whatsappQueue.addWhatsAppJob === 'function') {
              try {
                Logger.info('Manual Registration: Adding job to queue', { registrationId: registration.id });
                const job = await whatsappQueue.addWhatsAppJob({
                  phoneNumber: cleanPhone,
                  pdfBuffer: pdfBuffer,
                  memberName: memberName,
                  registrationId: registration.id,
                  eventId: registration.eventId,
                  userId: req.user.id // Manager/admin who created the registration
                });

                Logger.info('Manual Registration: Job added to queue', {
                  registrationId: registration.id,
                  jobId: job.id,
                  timestamp: new Date().toISOString()
                });
                return; // Queue will handle the rest
              } catch (queueError) {
                Logger.error('Manual Registration: Failed to add job to queue', queueError, {
                  registrationId: registration.id,
                  errorMessage: queueError.message,
                  errorStack: queueError.stack
                });
                Logger.info('Manual Registration: Falling back to direct call', { registrationId: registration.id });
                // Fall through to direct call
              }
            } else {
              Logger.info('Manual Registration: Queue not available, using direct call', {
                registrationId: registration.id,
                hasQueue: !!whatsappQueue,
                hasAddJob: !!(whatsappQueue && whatsappQueue.addWhatsAppJob)
              });
            }

            // Fallback: Direct WhatsApp call (async, single attempt, no retries)
            // For direct call, we need to acquire lock here (worker doesn't handle it)
            Logger.info('Manual Registration: Using direct WhatsApp call, acquiring lock', {
              registrationId: registration.id,
              phone: cleanPhone,
              memberName
            });

            const lockResult = await acquireWhatsAppLock(registration.id);

            if (!lockResult.acquired) {
              if (lockResult.reason === 'already_sent') {
                Logger.info('Manual Registration: WhatsApp already sent (direct call)', {
                  registrationId: registration.id,
                  pdfSentAt: lockResult.pdfSentAt
                });
              } else {
                Logger.warn('Manual Registration: Could not acquire lock for direct call', {
                  registrationId: registration.id,
                  reason: lockResult.reason
                });
              }
              return;
            }

            Logger.info('Manual Registration: Lock acquired for direct WhatsApp call', { registrationId: registration.id });

            const whatsappService = require('../services/whatsappService');
            Logger.info('Manual Registration: Calling whatsappService.sendPdfViaWhatsApp', {
              registrationId: registration.id,
              phone: cleanPhone,
              memberName,
              pdfBufferSize: pdfBuffer.length,
              pdfBufferSizeKB: (pdfBuffer.length / 1024).toFixed(2),
              pdfBufferType: typeof pdfBuffer,
              isBuffer: Buffer.isBuffer(pdfBuffer)
            });

            // Send via WhatsApp asynchronously (fire-and-forget)
            // NOTE: This is NOT awaited - API responds immediately while WhatsApp sends in background
            whatsappService.sendPdfViaWhatsApp(
              cleanPhone,
              pdfBuffer,
              memberName
            ).then(async (result) => {
              const endTime = new Date();
              const duration = endTime.getTime() - startTime.getTime();

              Logger.info('Manual Registration: WhatsApp service call completed', {
                registrationId: registration.id,
                success: result.success,
                hasError: !!result.error,
                error: result.error || null,
                durationMs: duration,
                timestamp: endTime.toISOString()
              });

              if (result.success) {
                Logger.info('Manual Registration: WhatsApp sent successfully', {
                  registrationId: registration.id,
                  durationMs: duration,
                  timestamp: endTime.toISOString()
                });

                Logger.info('Manual Registration: Updating pdfSentAt', { registrationId: registration.id });
                const updateResult = await updateLockToSentTime(registration.id);

                if (!updateResult.updated) {
                  Logger.warn('Manual Registration: Lock was released by another process', { registrationId: registration.id });
                } else {
                  Logger.info('Manual Registration: pdfSentAt updated successfully', {
                    registrationId: registration.id,
                    pdfSentAt: updateResult.actualSentTime.toISOString()
                  });
                }

                // Notify manager who created the registration
                Logger.info('Manual Registration: Notifying manager', {
                  registrationId: registration.id,
                  userId: req.user.id
                });
                const { notifyManagerOnWhatsAppSent } = require('../routes/publicEventRoutes');
                await notifyManagerOnWhatsAppSent(req.user.id, registrationForPdf, registrationForPdf.event, registrationForPdf.member);
                Logger.info('Manual Registration: Manager notification sent', { registrationId: registration.id });
              } else {
                Logger.error('Manual Registration: WhatsApp send failed', null, {
                  registrationId: registration.id,
                  durationMs: duration,
                  error: result.error || 'Unknown error',
                  resultData: result
                });
                Logger.info('Manual Registration: Releasing lock due to failure', { registrationId: registration.id });
                await releaseWhatsAppLock(registration.id);
              }
            }).catch(async (whatsappError) => {
              const endTime = new Date();
              const duration = endTime.getTime() - startTime.getTime();
              Logger.error('Manual Registration: Exception sending WhatsApp', whatsappError, {
                registrationId: registration.id,
                durationMs: duration,
                errorMessage: whatsappError.message,
                errorStack: whatsappError.stack,
                errorName: whatsappError.name
              });
              Logger.info('Manual Registration: Releasing lock due to exception', { registrationId: registration.id });
              await releaseWhatsAppLock(registration.id);
            });

            Logger.info('Manual Registration: WhatsApp send initiated asynchronously (non-blocking)', {
              registrationId: registration.id,
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            Logger.error('Manual Registration: Error in auto-send function', error, { registrationId: registration.id });
            await releaseWhatsAppLock(registration.id);
          }
        };

        // Run auto-send in background (don't await - non-blocking)
        autoSendWhatsApp().catch((error) => {
          Logger.error('Manual Registration: Exception in auto-send function', error, { registrationId: registration.id });
        });
      } else {
        Logger.warn('Manual Registration: WhatsApp auto-send skipped', {
          hasMember: !!freshMember,
          hasPhone: !!(freshMember && freshMember.phone),
          phone: freshMember?.phone || 'N/A',
          registrationId: registration.id
        });
      }

      const requestEndTime = new Date();
      const totalDuration = requestEndTime.getTime() - requestStartTime.getTime();

      Logger.info('Manual Registration: ========== RESPONSE SENT ==========', {
        timestamp: requestEndTime.toISOString(),
        registrationId: registration.id,
        memberId: freshMember.id,
        memberPhone: freshMember.phone,
        totalDurationMs: totalDuration,
        whatsappAutoSendTriggered: !!(freshMember && freshMember.phone)
      });

      res.status(201).json({
        success: true,
        message: 'Manual registration created successfully with cash payment',
        registration: {
          id: registration.id,
          eventId: registration.eventId,
          memberId: registration.memberId,
          status: registration.status,
          paymentStatus: registration.paymentStatus,
          paymentMethod: 'cash', // Hardcoded for now until column is added
          amountPaid: registration.amountPaid,
          registeredAt: registration.registeredAt
        },
        member: {
          id: freshMember.id,
          name: freshMember.name,
          phone: freshMember.phone,
          email: freshMember.email || null,
          businessName: freshMember.businessName,
          businessType: freshMember.businessType,
          profileImage: profileMeta.stored || freshMember.profileImage || null,
          profileImageURL: profileMeta.url,
          isNew: isNewMember
        },
        qrDataURL
      });

    } catch (transactionError) {
      Logger.error('Manual Registration: Transaction error', transactionError, {
        eventId: req.params.id,
        memberId: member?.id,
        errorMessage: transactionError.message,
        errorStack: transactionError.stack
      });
      await registrationTransaction.rollback();
      Logger.info('Manual Registration: Transaction rolled back');
      throw transactionError;
    }

  } catch (error) {
    const requestEndTime = new Date();
    const totalDuration = requestEndTime.getTime() - requestStartTime.getTime();

    Logger.error('Manual Registration: ========== ERROR ==========', {
      timestamp: requestEndTime.toISOString(),
      totalDurationMs: totalDuration,
      errorMessage: error.message,
      errorStack: error.stack,
      errorName: error.name,
      eventId: req.params.id,
      userId: req.user?.id
    });

    console.error('Manual registration error:', error);
    const errorMessage = error.message || 'Server error while creating manual registration';
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @desc    Get my registrations (Web)
// @route   GET /api/events/my/registrations
// @access  Private (web users)
router.get('/my/registrations', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // Find member by phone
    if (!req.user.phone) {
      return res.status(200).json({
        success: true,
        registrations: [],
        message: 'No phone number in profile. Cannot fetch registrations.'
      });
    }

    const member = await Member.findOne({
      where: { phone: req.user.phone }
    });

    if (!member) {
      return res.status(200).json({
        success: true,
        registrations: [],
        message: 'Member profile not found'
      });
    }

    const regs = await EventRegistration.findAll({
      where: { memberId: member.id },
      include: [{
        model: Event,
        as: 'event',
        include: [{ model: EventExhibitor, as: 'exhibitors' }]
      }],
      order: [['registeredAt', 'DESC']]
    });

    const items = await Promise.all(regs.map(async r => ({
      id: r.id,
      event: r.event,
      status: r.status,
      paymentStatus: r.paymentStatus,
      amountPaid: r.amountPaid,
      registeredAt: r.registeredAt,
      attendedAt: r.attendedAt,
      qrDataURL: await qrService.generateQrDataURL(r)
    })));

    res.json({ success: true, registrations: items });
  } catch (error) {
    console.error('Get my registrations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching registrations'
    });
  }
});

// @desc    Check registration status for an event (Web)
// @route   GET /api/events/:id/my-registration
// @access  Private (web users)
router.get('/:id/my-registration', protect, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);
    const userId = req.user.id;
    const { memberId } = req.query; // Optional memberId for admin to check other members

    if (isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID'
      });
    }

    // Determine member ID
    let targetMemberId = memberId ? parseInt(memberId, 10) : null;

    // If admin is checking someone else, use provided memberId
    if (targetMemberId && req.user.role === 'admin') {
      const member = await Member.findByPk(targetMemberId);
      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found'
        });
      }
    } else {
      // User checking their own registration - find member by phone
      if (!req.user.phone) {
        return res.status(200).json({
          success: true,
          isRegistered: false,
          message: 'No phone number in profile. Cannot check registration.'
        });
      }

      // Find member by phone
      let member = await Member.findOne({
        where: { phone: req.user.phone }
      });

      if (!member) {
        return res.status(200).json({
          success: true,
          isRegistered: false,
          message: 'Member profile not found'
        });
      }

      targetMemberId = member.id;
    }

    // Get registration status
    const registration = await EventRegistration.findOne({
      where: { eventId, memberId: targetMemberId },
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

// @desc    Check-in attendee by QR
// @route   POST /api/events/checkin
// @access  Public (no authentication required - QR token provides security)
router.post('/checkin', [
  body('qrToken', 'qrToken is required').notEmpty()
], async (req, res) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    Logger.qrCheckin('INFO', 'QR Check-in request received', {
      requestId,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      qrTokenLength: req.body.qrToken?.length || 0,
      qrTokenPrefix: req.body.qrToken?.substring(0, 10) || 'N/A'
    });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      Logger.qrCheckin('WARN', 'Validation error', {
        requestId,
        errors: errors.array()
      });
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { qrToken } = req.body;

    // Remove EVT: prefix if present
    const tokenWithoutPrefix = qrToken.replace(/^EVT:/, '');

    // Decode base64url
    let parsed;
    try {
      // Convert base64url to base64 (replace - with +, _ with /, add padding if needed)
      let base64 = tokenWithoutPrefix.replace(/-/g, '+').replace(/_/g, '/');
      // Add padding if needed
      while (base64.length % 4) {
        base64 += '=';
      }

      const decoded = Buffer.from(base64, 'base64').toString('utf8');
      parsed = JSON.parse(decoded);

      Logger.qrCheckin('DEBUG', 'QR token parsed successfully', {
        requestId,
        registrationId: parsed.data?.r,
        eventId: parsed.data?.e,
        memberId: parsed.data?.m
      });
    } catch (parseError) {
      Logger.qrCheckin('ERROR', 'QR token parsing failed', {
        requestId,
        error: parseError.message,
        errorStack: parseError.stack,
        tokenLength: qrToken.length,
        tokenPrefix: qrToken.substring(0, 50)
      });
      return res.status(400).json({ success: false, message: 'Invalid QR token format' });
    }

    // Verify token signature
    const isValid = qrService.verifyToken(parsed);
    if (!isValid) {
      Logger.qrCheckin('ERROR', 'QR token signature verification failed', {
        requestId,
        registrationId: parsed.data?.r,
        eventId: parsed.data?.e,
        memberId: parsed.data?.m,
        tokenData: parsed.data
      });
      return res.status(400).json({ success: false, message: 'Invalid QR token signature' });
    }

    const { r: registrationId, e: eventId, m: memberId } = parsed.data;

    Logger.qrCheckin('INFO', 'Looking up registration', {
      requestId,
      registrationId,
      eventId,
      memberId
    });

    const registration = await EventRegistration.findOne({ where: { id: registrationId, eventId, memberId } });
    if (!registration) {
      Logger.qrCheckin('WARN', 'Registration not found', {
        requestId,
        registrationId,
        eventId,
        memberId
      });
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    // Fetch member data for name and profile image (needed for both success and cancelled cases)
    const member = await Member.findByPk(memberId);
    const baseUrl = req.protocol + '://' + req.get('host');

    // Get member name and profile image URL
    let memberName = null;
    let memberImageURL = null;

    if (member) {
      memberName = member.name;
      if (member.profileImage) {
        // Check if it's already a Cloudinary URL
        if (member.profileImage.startsWith('http://') || member.profileImage.startsWith('https://')) {
          memberImageURL = member.profileImage;
        } else {
          // Legacy local file - generate URL
          memberImageURL = getFileUrl(member.profileImage, baseUrl, 'profile-images');
        }
      }
    }

    // Check if registration is cancelled or refunded
    if (registration.status === 'cancelled' || registration.paymentStatus === 'refunded') {
      Logger.qrCheckin('WARN', 'Registration cancelled or refunded', {
        requestId,
        registrationId,
        status: registration.status,
        paymentStatus: registration.paymentStatus
      });
      return res.status(400).json({
        success: false,
        message: 'Registration cancelled',
        status: registration.status,
        paymentStatus: registration.paymentStatus,
        cancelledAt: registration.cancelledAt,
        member: {
          name: memberName,
          profileImageURL: memberImageURL
        }
      });
    }

    if (registration.status === 'attended') {
      const responseTime = Date.now() - startTime;
      Logger.qrCheckin('INFO', 'Already checked-in', {
        requestId,
        registrationId,
        memberId,
        memberName,
        attendedAt: registration.attendedAt,
        responseTime: `${responseTime}ms`
      });

      return res.json({
        success: true,
        message: 'Already checked-in',
        attendedAt: registration.attendedAt,
        member: {
          name: memberName,
          profileImageURL: memberImageURL
        }
      });
    }

    await registration.update({ status: 'attended', attendedAt: new Date() });

    const responseTime = Date.now() - startTime;
    Logger.qrCheckin('INFO', 'Check-in successful', {
      requestId,
      registrationId,
      eventId,
      memberId,
      memberName,
      responseTime: `${responseTime}ms`
    });

    return res.json({
      success: true,
      message: 'Check-in successful',
      attendedAt: registration.attendedAt,
      member: {
        name: memberName,
        profileImageURL: memberImageURL
      }
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    Logger.apiError('/api/events/checkin', error, req);
    Logger.qrCheckin('ERROR', 'Check-in exception', {
      requestId,
      error: error.message,
      errorStack: error.stack,
      errorName: error.name,
      responseTime: `${responseTime}ms`
    });

    res.status(500).json({ success: false, message: 'Server error during check-in' });
  }
});

// Exhibitors CRUD
// @desc    Add exhibitor to event
// @route   POST /api/events/:eventId/exhibitors
// @access  Private (admin)
router.post('/:eventId/exhibitors', protect, [
  body('name', 'Name is required').notEmpty().trim(),
  body('logo').optional().trim(),
  body('description').optional().trim(),
  body('phone').optional().trim(),
  body('businessCategory').optional().isIn(['Flower Decoration', 'Tent', 'Lighting', 'Sound', 'Furniture', 'Other']).withMessage('Invalid business category')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { eventId } = req.params;
    const event = await Event.findByPk(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    const exhibitor = await EventExhibitor.create({
      eventId: Number(eventId),
      name: req.body.name,
      logo: req.body.logo || null,
      description: req.body.description || null,
      phone: req.body.phone || null,
      businessCategory: req.body.businessCategory || 'Other'
    });

    res.status(201).json({ success: true, exhibitor });
  } catch (error) {
    console.error('Create exhibitor error:', error);
    res.status(500).json({ success: false, message: 'Server error while creating exhibitor' });
  }
});

// @desc    List exhibitors
// @route   GET /api/events/:eventId/exhibitors
// @access  Public
router.get('/:eventId/exhibitors', async (req, res) => {
  try {
    const { eventId } = req.params;
    const exhibitors = await EventExhibitor.findAll({ where: { eventId } });
    res.json({ success: true, exhibitors });
  } catch (error) {
    console.error('List exhibitors error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching exhibitors' });
  }
});

// @desc    Update exhibitor
// @route   PUT /api/events/:eventId/exhibitors/:exhibitorId
// @access  Private (admin)
router.put('/:eventId/exhibitors/:exhibitorId', protect, [
  body('name').optional().trim(),
  body('logo').optional().trim(),
  body('description').optional().trim(),
  body('phone').optional().trim(),
  body('businessCategory').optional().isIn(['Flower Decoration', 'Tent', 'Lighting', 'Sound', 'Furniture', 'Other']).withMessage('Invalid business category')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const { eventId, exhibitorId } = req.params;
    const exhibitor = await EventExhibitor.findOne({ where: { id: exhibitorId, eventId } });
    if (!exhibitor) return res.status(404).json({ success: false, message: 'Exhibitor not found' });

    const updateData = {
      name: req.body.name ?? exhibitor.name,
      logo: req.body.logo ?? exhibitor.logo,
      description: req.body.description ?? exhibitor.description,
      phone: req.body.phone ?? exhibitor.phone,
      businessCategory: req.body.businessCategory ?? exhibitor.businessCategory
    };

    await exhibitor.update(updateData);
    res.json({ success: true, exhibitor });
  } catch (error) {
    console.error('Update exhibitor error:', error);
    res.status(500).json({ success: false, message: 'Server error while updating exhibitor' });
  }
});

// @desc    Delete exhibitor
// @route   DELETE /api/events/:eventId/exhibitors/:exhibitorId
// @access  Private (admin)
router.delete('/:eventId/exhibitors/:exhibitorId', protect, async (req, res) => {
  try {
    const { eventId, exhibitorId } = req.params;
    const exhibitor = await EventExhibitor.findOne({ where: { id: exhibitorId, eventId } });
    if (!exhibitor) return res.status(404).json({ success: false, message: 'Exhibitor not found' });
    await exhibitor.destroy();
    res.json({ success: true, message: 'Exhibitor deleted' });
  } catch (error) {
    console.error('Delete exhibitor error:', error);
    res.status(500).json({ success: false, message: 'Server error while deleting exhibitor' });
  }
});

// @desc    Get single registration details
// @route   GET /api/events/:eventId/registrations/:registrationId
// @access  Private (admin)
router.get('/:eventId/registrations/:registrationId', protect, async (req, res) => {
  try {
    const { eventId, registrationId } = req.params;

    const registration = await EventRegistration.findOne({
      where: {
        id: registrationId,
        eventId: eventId
      },
      include: [{ model: Member, as: 'member' }]
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    res.json({
      success: true,
      registration: registration.toJSON()
    });
  } catch (error) {
    Logger.error('Error fetching registration details', {
      eventId: req.params.eventId,
      registrationId: req.params.registrationId,
      error: error.message
    });
    console.error('Get registration details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching registration details'
    });
  }
});

// @desc    Update registration image
// @route   PUT /api/events/:eventId/registrations/:registrationId/image
// @access  Private (admin)
router.put('/:eventId/registrations/:registrationId/image', protect, [
  body('imageUrl').notEmpty().withMessage('Image URL is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { eventId, registrationId } = req.params;
    const { imageUrl } = req.body;

    // Find the registration
    const registration = await EventRegistration.findOne({
      where: {
        id: registrationId,
        eventId: eventId
      },
      include: [{ model: Member, as: 'member' }]
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    // Update registration image
    await registration.update({
      photo: imageUrl,
      photoUrl: imageUrl,
      profileImageURL: imageUrl
    });

    // Also update member image if member exists
    if (registration.member) {
      await registration.member.update({
        profileImage: imageUrl
      });
    }

    Logger.info('Registration image updated successfully', {
      eventId,
      registrationId,
      imageUrl: imageUrl.substring(0, 100) + '...' // Log only first 100 chars for security
    });

    res.json({
      success: true,
      message: 'Registration image updated successfully',
      registration: {
        ...registration.toJSON(),
        photo: imageUrl,
        photoUrl: imageUrl,
        profileImageURL: imageUrl
      }
    });
  } catch (error) {
    Logger.error('Error updating registration image', {
      eventId: req.params.eventId,
      registrationId: req.params.registrationId,
      error: error.message
    });
    console.error('Update registration image error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating registration image'
    });
  }
});

// @desc    Cancel event registration with optional refund
// @route   DELETE /api/events/:eventId/registrations/:registrationId
// @access  Private (admin)
router.delete('/:eventId/registrations/:registrationId', protect, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { eventId, registrationId } = req.params;
    const { refundAmount, reason } = req.body; // Optional refund amount and reason

    // Find the registration
    const registration = await EventRegistration.findOne({
      where: {
        id: registrationId,
        eventId: eventId
      },
      include: [{ model: Member, as: 'member' }],
      transaction
    });

    if (!registration) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    // Check if already cancelled
    if (registration.status === 'cancelled') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Registration is already cancelled'
      });
    }

    let refundResult = null;

    // Process refund if requested and payment exists
    if (refundAmount && registration.paymentId && registration.paymentStatus === 'paid') {
      try {
        const paymentService = require('../services/paymentService');

        // Validate refund amount doesn't exceed paid amount
        const maxRefundAmount = parseFloat(registration.amountPaid || 0);
        const requestedRefundAmount = parseFloat(refundAmount);

        if (requestedRefundAmount > maxRefundAmount) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Refund amount (${requestedRefundAmount}) cannot exceed paid amount (${maxRefundAmount})`
          });
        }

        refundResult = await paymentService.processRefund(
          registration.paymentId,
          requestedRefundAmount,
          {
            registrationId: registration.id,
            eventId: eventId,
            memberId: registration.memberId,
            cancelledBy: req.user?.id || 'admin',
            reason: reason || 'Registration cancelled by admin'
          }
        );

        // Update payment status to refunded
        await registration.update({
          paymentStatus: 'refunded',
          notes: (registration.notes || '') + `\nRefunded: ₹${requestedRefundAmount} on ${new Date().toISOString()}. Reason: ${reason || 'Admin cancellation'}`
        }, { transaction });

      } catch (refundError) {
        await transaction.rollback();
        Logger.error('Refund failed during registration cancellation', refundError, {
          registrationId,
          paymentId: registration.paymentId,
          refundAmount
        });

        return res.status(400).json({
          success: false,
          message: `Registration cancelled but refund failed: ${refundError.message}`,
          refundError: true
        });
      }
    } else if (refundAmount && (!registration.paymentId || registration.paymentStatus !== 'paid')) {
      // Handle case where refund is requested but no valid payment exists
      // This is common for free events or unpaid registrations
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Refund requested but no valid payment found. This registration may be free or unpaid.',
        isFreeEvent: true,
        paymentStatus: registration.paymentStatus,
        amountPaid: registration.amountPaid
      });
    }

    // Update registration status to cancelled with timestamp
    await registration.update({
      status: 'cancelled',
      cancelledAt: new Date(),
      notes: (registration.notes || '') + `\nCancelled on ${new Date().toISOString()}. Reason: ${reason || 'Admin cancellation'}`
    }, { transaction });

    // Decrease event attendee count
    const event = await Event.findByPk(eventId, { transaction });
    if (event && event.currentAttendees > 0) {
      await event.decrement('currentAttendees', { transaction });
    }

    await transaction.commit();

    Logger.info('Registration cancelled successfully', {
      eventId,
      registrationId,
      memberId: registration.memberId,
      cancelledBy: req.user?.id || 'unknown',
      refundProcessed: !!refundResult,
      refundAmount: refundResult ? refundResult.amount / 100 : null
    });

    res.json({
      success: true,
      message: refundResult
        ? 'Registration cancelled and refund processed successfully'
        : (registration.paymentStatus === 'paid'
          ? 'Registration cancelled successfully (no refund requested)'
          : 'Registration cancelled successfully (free event - no payment to refund)'),
      registration: {
        id: registration.id,
        status: registration.status,
        cancelledAt: registration.cancelledAt,
        paymentStatus: registration.paymentStatus,
        amountPaid: registration.amountPaid
      },
      refund: refundResult ? {
        id: refundResult.id,
        amount: refundResult.amount / 100, // Convert back to rupees
        status: refundResult.status,
        processedAt: new Date(refundResult.created_at * 1000)
      } : null,
      isFreeEvent: !registration.paymentId || registration.paymentStatus !== 'paid'
    });
  } catch (error) {
    await transaction.rollback();
    Logger.error('Error cancelling registration', {
      eventId: req.params.eventId,
      registrationId: req.params.registrationId,
      error: error.message
    });
    console.error('Cancel registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while cancelling registration'
    });
  }
});

// @desc    Process refund for a payment (standalone)
// @route   POST /api/events/:eventId/registrations/:registrationId/refund
// @access  Private (admin)
router.post('/:eventId/registrations/:registrationId/refund', protect, async (req, res) => {
  try {
    const { eventId, registrationId } = req.params;
    const { refundAmount, reason } = req.body;

    // Validate required fields
    if (!refundAmount || refundAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount is required and must be greater than 0'
      });
    }

    // Find the registration
    const registration = await EventRegistration.findOne({
      where: {
        id: registrationId,
        eventId: eventId
      },
      include: [{ model: Member, as: 'member' }]
    });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    // Check if payment exists and is paid
    if (!registration.paymentId || registration.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        message: 'No valid payment found for refund. Payment must be in "paid" status.'
      });
    }

    // Check if already refunded
    if (registration.paymentStatus === 'refunded') {
      return res.status(400).json({
        success: false,
        message: 'Payment has already been refunded'
      });
    }

    // Validate refund amount doesn't exceed paid amount
    const maxRefundAmount = parseFloat(registration.amountPaid || 0);
    const requestedRefundAmount = parseFloat(refundAmount);

    if (requestedRefundAmount > maxRefundAmount) {
      return res.status(400).json({
        success: false,
        message: `Refund amount (${requestedRefundAmount}) cannot exceed paid amount (${maxRefundAmount})`
      });
    }

    // Process refund
    const paymentService = require('../services/paymentService');
    const refundResult = await paymentService.processRefund(
      registration.paymentId,
      requestedRefundAmount,
      {
        registrationId: registration.id,
        eventId: eventId,
        memberId: registration.memberId,
        processedBy: req.user?.id || 'admin',
        reason: reason || 'Refund processed by admin'
      }
    );

    // Update payment status to refunded
    await registration.update({
      paymentStatus: 'refunded',
      notes: (registration.notes || '') + `\nRefunded: ₹${requestedRefundAmount} on ${new Date().toISOString()}. Reason: ${reason || 'Admin refund'}`
    });

    Logger.info('Refund processed successfully', {
      eventId,
      registrationId,
      memberId: registration.memberId,
      paymentId: registration.paymentId,
      refundId: refundResult.id,
      refundAmount: requestedRefundAmount,
      processedBy: req.user?.id || 'admin'
    });

    res.json({
      success: true,
      message: 'Refund processed successfully',
      registration: {
        id: registration.id,
        paymentStatus: registration.paymentStatus,
        amountPaid: registration.amountPaid
      },
      refund: {
        id: refundResult.id,
        amount: refundResult.amount / 100, // Convert back to rupees
        status: refundResult.status,
        processedAt: new Date(refundResult.created_at * 1000)
      }
    });

  } catch (error) {
    Logger.error('Error processing refund', {
      eventId: req.params.eventId,
      registrationId: req.params.registrationId,
      error: error.message
    });
    console.error('Refund error:', error);

    res.status(500).json({
      success: false,
      message: error.message || 'Server error while processing refund'
    });
  }
});

// @desc    Smart cancel event registration (auto-handles free vs paid events)
// @route   DELETE /api/events/:eventId/registrations/:registrationId/cancel-smart
// @access  Private (admin)
router.delete('/:eventId/registrations/:registrationId/cancel-smart', protect, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { eventId, registrationId } = req.params;
    const { refundAmount, reason } = req.body; // Optional refund amount and reason

    // Find the registration
    const registration = await EventRegistration.findOne({
      where: {
        id: registrationId,
        eventId: eventId
      },
      include: [{ model: Member, as: 'member' }],
      transaction
    });

    if (!registration) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    // Check if already cancelled
    if (registration.status === 'cancelled') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Registration is already cancelled'
      });
    }

    let refundResult = null;
    const isPaidEvent = registration.paymentId && registration.paymentStatus === 'paid';

    // Auto-handle refund logic
    if (refundAmount && isPaidEvent) {
      // Process refund for paid events if amount specified
      try {
        const paymentService = require('../services/paymentService');

        // Validate refund amount doesn't exceed paid amount
        const maxRefundAmount = parseFloat(registration.amountPaid || 0);
        const requestedRefundAmount = parseFloat(refundAmount);

        if (requestedRefundAmount > maxRefundAmount) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: `Refund amount (${requestedRefundAmount}) cannot exceed paid amount (${maxRefundAmount})`
          });
        }

        refundResult = await paymentService.processRefund(
          registration.paymentId,
          requestedRefundAmount,
          {
            registrationId: registration.id,
            eventId: eventId,
            memberId: registration.memberId,
            cancelledBy: req.user?.id || 'admin',
            reason: reason || 'Registration cancelled by admin'
          }
        );

        // Update payment status to refunded
        await registration.update({
          paymentStatus: 'refunded',
          notes: (registration.notes || '') + `\nRefunded: ₹${requestedRefundAmount} on ${new Date().toISOString()}. Reason: ${reason || 'Admin cancellation'}`
        }, { transaction });

      } catch (refundError) {
        await transaction.rollback();
        Logger.error('Refund failed during registration cancellation', refundError, {
          registrationId,
          paymentId: registration.paymentId,
          refundAmount
        });

        return res.status(400).json({
          success: false,
          message: `Registration cancelled but refund failed: ${refundError.message}`,
          refundError: true
        });
      }
    } else if (!isPaidEvent && refundAmount) {
      // Ignore refund amount for free events but log it
      Logger.info('Refund amount ignored for free event', {
        registrationId,
        eventId,
        requestedRefundAmount: refundAmount,
        paymentStatus: registration.paymentStatus
      });
    }

    // Update registration status to cancelled with timestamp
    await registration.update({
      status: 'cancelled',
      cancelledAt: new Date(),
      notes: (registration.notes || '') + `\nCancelled on ${new Date().toISOString()}. Reason: ${reason || 'Admin cancellation'}`
    }, { transaction });

    // Decrease event attendee count
    const event = await Event.findByPk(eventId, { transaction });
    if (event && event.currentAttendees > 0) {
      await event.decrement('currentAttendees', { transaction });
    }

    await transaction.commit();

    Logger.info('Registration cancelled successfully (smart)', {
      eventId,
      registrationId,
      memberId: registration.memberId,
      cancelledBy: req.user?.id || 'unknown',
      refundProcessed: !!refundResult,
      refundAmount: refundResult ? refundResult.amount / 100 : null,
      wasPaidEvent: isPaidEvent
    });

    // Smart response based on event type
    let message;
    if (refundResult) {
      message = 'Registration cancelled and refund processed successfully';
    } else if (isPaidEvent) {
      message = 'Registration cancelled successfully (paid event - no refund processed)';
    } else {
      message = 'Registration cancelled successfully (free event)';
    }

    res.json({
      success: true,
      message,
      registration: {
        id: registration.id,
        status: registration.status,
        cancelledAt: registration.cancelledAt,
        paymentStatus: registration.paymentStatus,
        amountPaid: registration.amountPaid
      },
      refund: refundResult ? {
        id: refundResult.id,
        amount: refundResult.amount / 100, // Convert back to rupees
        status: refundResult.status,
        processedAt: new Date(refundResult.created_at * 1000)
      } : null,
      isFreeEvent: !isPaidEvent,
      wasPaidEvent: isPaidEvent,
      refundIgnored: !isPaidEvent && !!refundAmount
    });
  } catch (error) {
    await transaction.rollback();
    Logger.error('Error cancelling registration (smart)', {
      eventId: req.params.eventId,
      registrationId: req.params.registrationId,
      error: error.message
    });
    console.error('Cancel registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while cancelling registration'
    });
  }
});

// Export event registrations as CSV - Manager access
router.get('/manager/:eventId/export/registrations/csv', [
  protect,
  authorize('manager', 'admin'),
  query('eventId').isUUID().withMessage('Invalid event ID')
], async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Verify event exists and user has access
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Get registrations with member details
    const registrations = await EventRegistration.findAll({
      where: { eventId },
      include: [
        {
          model: Member,
          as: 'member',
          attributes: ['id', 'name', 'phone', 'email', 'businessName', 'businessType', 'city']
        }
      ],
      order: [['registeredAt', 'DESC']]
    });

    if (registrations.length === 0) {
      return res.status(404).json({ message: 'No registrations found for this event' });
    }

    // Create CSV content
    const headers = [
      'Registration ID',
      'Member Name',
      'Phone',
      'Email',
      'Business Name',
      'Business Type',
      'City',
      'Amount Paid',
      'Payment Status',
      'Registration Status',
      'Registered At',
      'Attended At'
    ];

    const csvRows = registrations.map(reg => [
      reg.id,
      `"${reg.member?.name || reg.name || ''}"`,
      `"${reg.member?.phone || reg.phone || ''}"`,
      `"${reg.member?.email || reg.email || ''}"`,
      `"${reg.member?.businessName || reg.businessName || ''}"`,
      `"${reg.member?.businessType || reg.businessType || ''}"`,
      `"${reg.member?.city || reg.city || ''}"`,
      reg.amountPaid || 0,
      reg.paymentStatus || 'pending',
      reg.status || 'registered',
      reg.registeredAt ? new Date(reg.registeredAt).toLocaleString('en-IN') : '',
      reg.attendedAt ? new Date(reg.attendedAt).toLocaleString('en-IN') : ''
    ]);

    const csvContent = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="event-${eventId}-registrations.csv"`);

    res.send(csvContent);
  } catch (error) {
    Logger.error('Error exporting registrations to CSV', {
      eventId: req.params.eventId,
      error: error.message
    });
    res.status(500).json({ message: 'Error exporting registrations' });
  }
});

// Export event registrations as Excel - Manager access
router.get('/manager/:eventId/export/registrations/excel', [
  protect,
  authorize('manager', 'admin'),
  query('eventId').isUUID().withMessage('Invalid event ID')
], async (req, res) => {
  try {
    const XLSX = require('xlsx');
    const { eventId } = req.params;
    
    // Verify event exists and user has access
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Get registrations with member details
    const registrations = await EventRegistration.findAll({
      where: { eventId },
      include: [
        {
          model: Member,
          as: 'member',
          attributes: ['id', 'name', 'phone', 'email', 'businessName', 'businessType', 'city']
        }
      ],
      order: [['registeredAt', 'DESC']]
    });

    if (registrations.length === 0) {
      return res.status(404).json({ message: 'No registrations found for this event' });
    }

    // Create worksheet data
    const worksheetData = registrations.map(reg => ({
      'Registration ID': reg.id,
      'Member Name': reg.member?.name || reg.name || '',
      'Phone': reg.member?.phone || reg.phone || '',
      'Email': reg.member?.email || reg.email || '',
      'Business Name': reg.member?.businessName || reg.businessName || '',
      'Business Type': reg.member?.businessType || reg.businessType || '',
      'City': reg.member?.city || reg.city || '',
      'Amount Paid': reg.amountPaid || 0,
      'Payment Status': reg.paymentStatus || 'pending',
      'Registration Status': reg.status || 'registered',
      'Registered At': reg.registeredAt ? new Date(reg.registeredAt).toLocaleString('en-IN') : '',
      'Attended At': reg.attendedAt ? new Date(reg.attendedAt).toLocaleString('en-IN') : ''
    }));

    // Create workbook
    const ws = XLSX.utils.json_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Registrations');

    // Set headers for Excel download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="event-${eventId}-registrations.xlsx"`);

    // Write file to response
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.send(excelBuffer);
  } catch (error) {
    Logger.error('Error exporting registrations to Excel', {
      eventId: req.params.eventId,
      error: error.message
    });
    res.status(500).json({ message: 'Error exporting registrations' });
  }
});

module.exports = router;












