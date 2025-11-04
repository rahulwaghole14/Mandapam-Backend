const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const Event = require('../models/Event');
const Member = require('../models/Member');
const EventRegistration = require('../models/EventRegistration');
const EventExhibitor = require('../models/EventExhibitor');
const qrService = require('../services/qrService');
const paymentService = require('../services/paymentService');
const User = require('../models/User');
const { protect, authorize, authorizeDistrict } = require('../middleware/authMiddleware');
const fcmService = require('../services/fcmService');
const { 
  eventImagesUpload,
  handleMulterError,
  getFileUrl,
  deleteFile,
  getFileInfo
} = require('../config/multerConfig');

const router = express.Router();

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
        event.imageURL = getFileUrl(event.image, baseUrl);
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
        event.imageURL = getFileUrl(event.image, baseUrl);
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
      event.imageURL = getFileUrl(event.image, baseUrl);
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
  body('image').optional().trim(),
  body('imageURL').optional().trim()
], authorizeDistrict, eventImagesUpload.single('image'), handleMulterError, async (req, res) => {
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
        // Format: YYYY-MM-DDTHH:MM - add seconds
        dtStr = dtStr + ':00';
      }
      const dt = new Date(dtStr);
      if (!isNaN(dt.getTime())) {
        req.body.startDate = dt.toISOString().split('T')[0];
        const timeStr = dt.toTimeString().split(' ')[0].slice(0, 5); // HH:MM
        if (timeStr !== '00:00') {
          req.body.startTime = timeStr;
        }
      }
    }
    if (req.body.endDateTime && !req.body.endDate) {
      // Handle formats like "2025-11-01T12:52" or full ISO
      let dtStr = req.body.endDateTime;
      if (dtStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
        // Format: YYYY-MM-DDTHH:MM - add seconds
        dtStr = dtStr + ':00';
      }
      const dt = new Date(dtStr);
      if (!isNaN(dt.getTime())) {
        req.body.endDate = dt.toISOString().split('T')[0];
        const timeStr = dt.toTimeString().split(' ')[0].slice(0, 5); // HH:MM
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

    // Handle uploaded event image
    const baseUrl = req.protocol + '://' + req.get('host');
    if (req.file) {
      console.log('Event image uploaded:', req.file.filename);
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
      image: req.file ? req.file.filename : (req.body.image || req.body.imageURL || req.body.url),
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

    // Transform image field to include full URL if image exists
    const eventResponse = eventWithDetails.toJSON();
    if (eventResponse.image) {
      const baseUrl = req.protocol + '://' + req.get('host');
      eventResponse.imageURL = getFileUrl(eventResponse.image, baseUrl);
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
        image: req.file ? {
          filename: req.file.filename,
          url: getFileUrl(req.file.filename, baseUrl)
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
  body('image').optional().trim(),
], authorizeDistrict, eventImagesUpload.single('image'), handleMulterError, async (req, res) => {
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

    // Check district access for sub-admins
    if (req.user.role === 'sub-admin' && existingEvent.district !== req.user.district) {
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

    // Handle startDateTime/endDateTime format from frontend
    if (req.body.startDateTime && !req.body.startDate) {
      // Handle formats like "2025-11-01T12:52" or full ISO
      let dtStr = req.body.startDateTime;
      if (dtStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
        // Format: YYYY-MM-DDTHH:MM - add seconds
        dtStr = dtStr + ':00';
      }
      const dt = new Date(dtStr);
      if (!isNaN(dt.getTime())) {
        req.body.startDate = dt.toISOString().split('T')[0];
        const timeStr = dt.toTimeString().split(' ')[0].slice(0, 5); // HH:MM
        if (timeStr !== '00:00') {
          req.body.startTime = timeStr;
        }
      }
    }
    if (req.body.endDateTime && !req.body.endDate) {
      // Handle formats like "2025-11-01T12:52" or full ISO
      let dtStr = req.body.endDateTime;
      if (dtStr.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
        // Format: YYYY-MM-DDTHH:MM - add seconds
        dtStr = dtStr + ':00';
      }
      const dt = new Date(dtStr);
      if (!isNaN(dt.getTime())) {
        req.body.endDate = dt.toISOString().split('T')[0];
        const timeStr = dt.toTimeString().split(' ')[0].slice(0, 5); // HH:MM
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

    // Handle uploaded event image
    const baseUrl = req.protocol + '://' + req.get('host');
    if (req.file) {
      console.log('📸 New image uploaded:', req.file.filename);
      console.log('📸 Old image filename:', existingEvent.image);
      
      // Delete old event image if exists
      if (existingEvent.image) {
        try {
          await deleteFile(existingEvent.image);
          console.log('✅ Old image deleted successfully');
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

    // Handle image field - only update if new file is uploaded
    if (req.file) {
      updateData.image = req.file.filename;
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

    // Transform image field to include full URL if image exists
    const eventResponse = event.toJSON();
    if (eventResponse.image) {
      eventResponse.imageURL = getFileUrl(eventResponse.image, baseUrl, 'event-images');
      console.log('📸 Generated image URL:', eventResponse.imageURL);
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
        image: req.file ? {
          filename: req.file.filename,
          url: getFileUrl(req.file.filename, baseUrl, 'event-images')
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

    // Check district access for sub-admins
    if (req.user.role === 'sub-admin' && event.district !== req.user.district) {
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
    if (req.user.role === 'sub-admin') {
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

    // Check district access for sub-admins
    if (req.user.role === 'sub-admin' && event.district !== req.user.district) {
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
      include: [{ model: Member, as: 'member', attributes: ['id', 'name', 'phone'] }],
      order: [['registeredAt', 'DESC']]
    });

    const list = regs.map(r => ({
      memberId: r.memberId,
      name: r.member?.name,
      phone: r.member?.phone,
      amountPaid: r.amountPaid,
      paymentStatus: r.paymentStatus,
      status: r.status,
      registeredAt: r.registeredAt,
      attendedAt: r.attendedAt
    }));

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
          message: 'Member profile not found. Please ensure your phone number matches a member record.'
        });
      }
      
      targetMemberId = member.id;
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
        status: registration.status,
        paymentStatus: registration.paymentStatus,
        amountPaid: registration.amountPaid
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
// @access  Private (admin)
router.post('/checkin', protect, [
  body('qrToken', 'qrToken is required').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { qrToken } = req.body;
    const parsed = JSON.parse(Buffer.from(qrToken.replace(/^EVT:/, ''), 'base64url').toString('utf8'));
    const isValid = qrService.verifyToken(parsed);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid QR token' });
    }

    const { r: registrationId, e: eventId, m: memberId } = parsed.data;

    const registration = await EventRegistration.findOne({ where: { id: registrationId, eventId, memberId } });
    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    if (registration.status === 'attended') {
      return res.json({ success: true, message: 'Already checked-in', attendedAt: registration.attendedAt });
    }

    await registration.update({ status: 'attended', attendedAt: new Date() });
    return res.json({ success: true, message: 'Check-in successful', attendedAt: registration.attendedAt });
  } catch (error) {
    console.error('Check-in error:', error);
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

module.exports = router;












