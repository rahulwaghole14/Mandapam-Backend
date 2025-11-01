const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const Event = require('../models/Event');
const Member = require('../models/Member');
const EventRegistration = require('../models/EventRegistration');
const EventExhibitor = require('../models/EventExhibitor');
const qrService = require('../services/qrService');
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
        event.imageURL = `/uploads/event-images/${event.image}`;
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
        event.imageURL = `/uploads/event-images/${event.image}`;
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
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id, {
      where: {
        isPublic: true,
        isActive: true
      },
      include: [
        { model: User, as: 'createdByUser', attributes: ['name', 'email'] },
        { model: User, as: 'updatedByUser', attributes: ['name', 'email'] }
      ]
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Transform image field to include full URL if image exists
    if (event.image) {
      event.imageURL = `/uploads/event-images/${event.image}`;
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
      eventResponse.imageURL = `/uploads/event-images/${eventResponse.image}`;
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
  body('description').optional().trim(),
  body('type').optional().isIn([
    'Meeting', 'Workshop', 'Seminar', 'Celebration', 'Other'
  ]),
  body('startDate').optional().isISO8601().withMessage('Invalid start date format'),
  body('endDate').optional().isISO8601().withMessage('Invalid end date format'),
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

    // Validate date logic if both dates are provided
    if (req.body.startDate && req.body.endDate) {
      const startDate = new Date(req.body.startDate);
      const endDate = new Date(req.body.endDate);
      if (endDate < startDate) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date'
        });
      }
    }

    // Handle uploaded event image
    const baseUrl = req.protocol + '://' + req.get('host');
    if (req.file) {
      // Delete old event image if exists
      if (existingEvent.image) {
        try {
          await deleteFile(existingEvent.image);
        } catch (error) {
          console.log('Could not delete old event image:', error.message);
        }
      }
      console.log('Event image updated:', req.file.filename);
    }

    // Prepare update data
    const updateData = {
      ...req.body,
      updatedBy: req.user.id
    };

    // Handle image field
    if (req.file) {
      updateData.image = req.file.filename;
    }

    // Convert dates if provided
    if (req.body.startDate) {
      updateData.startDate = new Date(req.body.startDate);
    }
    if (req.body.endDate) {
      updateData.endDate = new Date(req.body.endDate);
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
      eventResponse.imageURL = `/uploads/event-images/${eventResponse.image}`;
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
          url: getFileUrl(req.file.filename, baseUrl)
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












