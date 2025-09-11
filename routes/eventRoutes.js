const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const Event = require('../models/Event');
const User = require('../models/User');
const { protect, authorize, authorizeDistrict } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply protection to all routes
router.use(protect);

// @desc    Get all events with filtering and pagination
// @route   GET /api/events
// @access  Private
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

    // District-based filtering for sub-admins
    if (req.user.role === 'sub-admin') {
      where.district = req.user.district;
    }

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

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id, {
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

    // Check district access for sub-admins
    if (req.user.role === 'sub-admin' && event.district !== req.user.district) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to event in different district'
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

// @desc    Create new event
// @route   POST /api/events
// @access  Private
router.post('/', [
  body('title', 'Event title is required').notEmpty().trim(),
  body('description').optional().trim(),
  body('type', 'Event type is required').isIn([
    'Meeting', 'Workshop', 'Seminar', 'Celebration', 'Other'
  ]),
  body('startDate', 'Event start date is required').isISO8601(),
  body('endDate').optional().isISO8601(),
  body('location').optional().trim(),
  body('address').optional().trim(),
  body('city').optional().trim(),
  body('state').optional().trim(),
  body('pincode').optional().matches(/^[0-9]{6}$/),
  body('contactPerson').optional().trim(),
  body('contactPhone').optional().matches(/^[0-9+\-\s()]+$/),
  body('contactEmail').optional().isEmail(),
  body('maxAttendees').optional().isInt({ min: 1 }),
  body('registrationFee').optional().isFloat({ min: 0 }),
  body('isActive').optional().isBoolean(),
  body('isPublic').optional().isBoolean(),
  body('image').optional().trim(),
  body('associationId', 'Association ID is required').isInt({ min: 1 })
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

    // Validate date logic
    const startDate = new Date(req.body.startDate);
    const endDate = req.body.endDate ? new Date(req.body.endDate) : null;
    
    if (endDate && endDate < startDate) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
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
      state: req.body.state,
      pincode: req.body.pincode,
      contactPerson: req.body.contactPerson,
      contactPhone: req.body.contactPhone,
      contactEmail: req.body.contactEmail,
      maxAttendees: req.body.maxAttendees,
      registrationFee: req.body.registrationFee,
      isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      isPublic: req.body.isPublic !== undefined ? req.body.isPublic : true,
      image: req.body.image,
      associationId: req.body.associationId,
      createdBy: req.user.id,
      updatedBy: req.user.id
    };

    // Create event
    const event = await Event.create(eventData);

    // Get event with populated fields
    const eventWithDetails = await Event.findByPk(event.id, {
      include: [
        { model: User, as: 'createdByUser', attributes: ['name', 'email'] }
      ]
    });

    res.status(201).json({
      success: true,
      event: eventWithDetails
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
router.put('/:id', [
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
  body('associationId').optional().isInt({ min: 1 }).withMessage('Invalid association ID')
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

    // Prepare update data
    const updateData = {
      ...req.body,
      updatedBy: req.user.id
    };

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

    res.status(200).json({
      success: true,
      event
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
router.delete('/:id', async (req, res) => {
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

// @desc    Get upcoming events
// @route   GET /api/events/upcoming
// @access  Private
router.get('/upcoming', async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    // Build filter for district-based access
    const where = {
      startDate: { [Op.gte]: new Date() },
      status: { [Op.in]: ['Upcoming', 'Ongoing'] }
    };

    if (req.user.role === 'sub-admin') {
      where.district = req.user.district;
    }

    const upcomingEvents = await Event.findAll({
      where,
      include: [
        { model: User, as: 'createdByUser', attributes: ['name', 'email'] }
      ],
      order: [['startDate', 'ASC']],
      limit: parseInt(limit)
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
router.put('/:id/status', [
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

module.exports = router;












