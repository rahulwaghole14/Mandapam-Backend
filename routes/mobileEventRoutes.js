const express = require('express');
const Event = require('../models/Event');
const { protectMobile } = require('../middleware/mobileAuthMiddleware');

const router = express.Router();

// @desc    Get all events with pagination and filtering
// @route   GET /api/mobile/events
// @access  Private
router.get('/events', protectMobile, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = { isPublic: true };
    
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    if (req.query.city) {
      filter['location.city'] = new RegExp(req.query.city, 'i');
    }
    
    if (req.query.district) {
      filter['location.district'] = new RegExp(req.query.district, 'i');
    }

    // Build search query
    let searchQuery = {};
    if (req.query.search) {
      searchQuery = {
        $or: [
          { title: new RegExp(req.query.search, 'i') },
          { description: new RegExp(req.query.search, 'i') },
          { organizer: new RegExp(req.query.search, 'i') }
        ]
      };
    }

    // Combine filters
    const finalFilter = { ...filter, ...searchQuery };

    const events = await Event.find(finalFilter)
      .select('-createdBy -updatedBy')
      .sort({ date: 1 }) // Sort by date ascending
      .skip(skip)
      .limit(limit);

    const total = await Event.countDocuments(finalFilter);

    res.status(200).json({
      success: true,
      count: events.length,
      total,
      page,
      pages: Math.ceil(total / limit),
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

// @desc    Get specific event details
// @route   GET /api/mobile/events/:id
// @access  Private
router.get('/events/:id', protectMobile, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID format'
      });
    }

    const event = await Event.findById(id)
      .select('-createdBy -updatedBy');

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
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

// @desc    Get upcoming events
// @route   GET /api/mobile/events/upcoming
// @access  Private
router.get('/events/upcoming', protectMobile, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const now = new Date();
    const filter = {
      isPublic: true,
      date: { $gte: now },
      status: { $in: ['Upcoming', 'Ongoing'] }
    };

    const events = await Event.find(filter)
      .select('-createdBy -updatedBy')
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Event.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: events.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      events
    });

  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching upcoming events'
    });
  }
});

// @desc    Search events
// @route   GET /api/mobile/events/search
// @access  Private
router.get('/events/search', protectMobile, async (req, res) => {
  try {
    const { q, type, city, district, status } = req.query;
    
    if (!q && !type && !city && !district && !status) {
      return res.status(400).json({
        success: false,
        message: 'Please provide search criteria'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build search query
    const searchQuery = { isPublic: true };
    
    if (q) {
      searchQuery.$or = [
        { title: new RegExp(q, 'i') },
        { description: new RegExp(q, 'i') },
        { organizer: new RegExp(q, 'i') }
      ];
    }
    
    if (type) {
      searchQuery.type = type;
    }
    
    if (city) {
      searchQuery['location.city'] = new RegExp(city, 'i');
    }
    
    if (district) {
      searchQuery['location.district'] = new RegExp(district, 'i');
    }
    
    if (status) {
      searchQuery.status = status;
    }

    const events = await Event.find(searchQuery)
      .select('-createdBy -updatedBy')
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Event.countDocuments(searchQuery);

    res.status(200).json({
      success: true,
      count: events.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      events
    });

  } catch (error) {
    console.error('Search events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching events'
    });
  }
});

// @desc    Get events by date range
// @route   GET /api/mobile/events/date-range
// @access  Private
router.get('/events/date-range', protectMobile, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide startDate and endDate'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter = {
      isPublic: true,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    const events = await Event.find(filter)
      .select('-createdBy -updatedBy')
      .sort({ date: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Event.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: events.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      events
    });

  } catch (error) {
    console.error('Get events by date range error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching events by date range'
    });
  }
});

// @desc    Get event statistics
// @route   GET /api/mobile/events/stats
// @access  Private
router.get('/events/stats', protectMobile, async (req, res) => {
  try {
    const now = new Date();
    
    const stats = await Event.aggregate([
      { $match: { isPublic: true } },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          upcomingEvents: {
            $sum: {
              $cond: [
                { $and: [{ $gte: ['$date', now] }, { $eq: ['$status', 'Upcoming'] }] },
                1,
                0
              ]
            }
          },
          ongoingEvents: {
            $sum: {
              $cond: [{ $eq: ['$status', 'Ongoing'] }, 1, 0]
            }
          },
          completedEvents: {
            $sum: {
              $cond: [
                { $and: [{ $lt: ['$date', now] }, { $eq: ['$status', 'Completed'] }] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const eventTypes = await Event.aggregate([
      { $match: { isPublic: true } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      stats: stats[0] || {
        totalEvents: 0,
        upcomingEvents: 0,
        ongoingEvents: 0,
        completedEvents: 0
      },
      eventTypes
    });

  } catch (error) {
    console.error('Get event stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching event statistics'
    });
  }
});

module.exports = router;
