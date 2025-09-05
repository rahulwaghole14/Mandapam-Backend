const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Event = require('../models/Event');
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
  query('sortBy').optional().isIn(['title', 'date', 'priority', 'createdAt']),
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
    const filter = {};

    // District-based filtering for sub-admins
    if (req.user.role === 'sub-admin') {
      filter['location.district'] = req.user.district;
    }

    // Apply search filters
    if (search) {
      filter.$text = { $search: search };
    }

    if (type) {
      filter.type = type;
    }

    if (status) {
      filter.status = status;
    }

    if (priority) {
      filter.priority = priority;
    }

    if (city) {
      filter['location.city'] = city;
    }

    if (district) {
      filter['location.district'] = district;
    }

    // Date range filtering
    if (dateFrom || dateTo) {
      filter.date = {};
      if (dateFrom) {
        filter.date.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        filter.date.$lte = new Date(dateTo);
      }
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const events = await Event.find(filter)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Event.countDocuments(filter);

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
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check district access for sub-admins
    if (req.user.role === 'sub-admin' && event.location.district !== req.user.district) {
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
  body('description', 'Event description is required').notEmpty().trim(),
  body('type', 'Event type is required').isIn([
    'Meeting', 'Workshop', 'Seminar', 'Conference', 'Celebration', 
    'Training', 'Announcement', 'Other'
  ]),
  body('date', 'Event date is required').isISO8601(),
  body('startTime', 'Start time is required').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('endTime', 'End time is required').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('location.address', 'Event address is required').notEmpty().trim(),
  body('location.city', 'City is required').notEmpty().trim(),
  body('location.district', 'District is required').notEmpty().trim(),
  body('location.state', 'State is required').notEmpty().trim(),
  body('location.pincode', 'Pincode is required').matches(/^[0-9]{6}$/),
  body('organizer', 'Organizer name is required').notEmpty().trim(),
  body('contactPerson.name', 'Contact person name is required').notEmpty().trim(),
  body('contactPerson.phone', 'Contact phone is required').matches(/^[0-9]{10}$/),
  body('priority').optional().isIn(['Low', 'Medium', 'High', 'Urgent']),
  body('targetAudience').optional().isArray(),
  body('maxAttendees').optional().isInt({ min: 1 }),
  body('registrationRequired').optional().isBoolean(),
  body('registrationDeadline').optional().isISO8601(),
  body('tags').optional().isArray()
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

    // Validate time logic
    const startTime = req.body.startTime;
    const endTime = req.body.endTime;
    
    if (startTime >= endTime) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time'
      });
    }

    // Add createdBy and updatedBy
    req.body.createdBy = req.user._id;
    req.body.updatedBy = req.user._id;

    // Create event
    const event = await Event.create(req.body);

    // Populate createdBy field
    await event.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      event
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
  body('description').optional().notEmpty().trim().withMessage('Description cannot be empty'),
  body('type').optional().isIn([
    'Meeting', 'Workshop', 'Seminar', 'Conference', 'Celebration', 
    'Training', 'Announcement', 'Other'
  ]),
  body('date').optional().isISO8601().withMessage('Invalid date format'),
  body('startTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format'),
  body('endTime').optional().matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Invalid time format'),
  body('location.address').optional().notEmpty().trim().withMessage('Address cannot be empty'),
  body('location.city').optional().notEmpty().trim().withMessage('City cannot be empty'),
  body('location.district').optional().notEmpty().trim().withMessage('District cannot be empty'),
  body('location.state').optional().notEmpty().trim().withMessage('State cannot be empty'),
  body('location.pincode').optional().matches(/^[0-9]{6}$/).withMessage('Invalid pincode'),
  body('organizer').optional().notEmpty().trim().withMessage('Organizer cannot be empty'),
  body('contactPerson.name').optional().notEmpty().trim().withMessage('Contact person name cannot be empty'),
  body('contactPerson.phone').optional().matches(/^[0-9]{10}$/).withMessage('Invalid phone number'),
  body('priority').optional().isIn(['Low', 'Medium', 'High', 'Urgent']),
  body('maxAttendees').optional().isInt({ min: 1 }).withMessage('Max attendees must be at least 1'),
  body('registrationDeadline').optional().isISO8601().withMessage('Invalid deadline format')
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
    const existingEvent = await Event.findById(req.params.id);
    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check district access for sub-admins
    if (req.user.role === 'sub-admin' && existingEvent.location.district !== req.user.district) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to event in different district'
      });
    }

    // Validate time logic if both times are provided
    if (req.body.startTime && req.body.endTime) {
      if (req.body.startTime >= req.body.endTime) {
        return res.status(400).json({
          success: false,
          message: 'End time must be after start time'
        });
      }
    }

    // Add updatedBy
    req.body.updatedBy = req.user._id;

    // Update event
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email')
     .populate('updatedBy', 'name email');

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
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check district access for sub-admins
    if (req.user.role === 'sub-admin' && event.location.district !== req.user.district) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to event in different district'
      });
    }

    await event.deleteOne();

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
    const filter = {
      date: { $gte: new Date() },
      status: { $in: ['Upcoming', 'Ongoing'] }
    };

    if (req.user.role === 'sub-admin') {
      filter['location.district'] = req.user.district;
    }

    const upcomingEvents = await Event.find(filter)
      .populate('createdBy', 'name email')
      .sort({ date: 1 })
      .limit(parseInt(limit));

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
    const filter = {};
    if (req.user.role === 'sub-admin') {
      filter['location.district'] = req.user.district;
    }

    // Get counts
    const totalEvents = await Event.countDocuments(filter);
    const upcomingEvents = await Event.countDocuments({
      ...filter,
      date: { $gte: new Date() },
      status: { $in: ['Upcoming', 'Ongoing'] }
    });
    const completedEvents = await Event.countDocuments({
      ...filter,
      status: 'Completed'
    });
    const cancelledEvents = await Event.countDocuments({
      ...filter,
      status: { $in: ['Cancelled', 'Postponed'] }
    });

    // Get type distribution
    const typeStats = await Event.aggregate([
      { $match: filter },
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get priority distribution
    const priorityStats = await Event.aggregate([
      { $match: filter },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get monthly event count for current year
    const currentYear = new Date().getFullYear();
    const monthlyStats = await Event.aggregate([
      { $match: { ...filter, date: { $gte: new Date(currentYear, 0, 1) } } },
      {
        $group: {
          _id: { $month: '$date' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

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

    const event = await Event.findById(req.params.id);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Check district access for sub-admins
    if (req.user.role === 'sub-admin' && event.location.district !== req.user.district) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to event in different district'
      });
    }

    // Update status
    event.status = status;
    event.updatedBy = req.user._id;
    await event.save();

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






