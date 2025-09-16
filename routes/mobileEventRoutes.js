const express = require('express');
const { Event, Association } = require('../models');
const { Op, sequelize } = require('sequelize');
const { protectMobile } = require('../middleware/mobileAuthMiddleware');

const router = express.Router();

// @desc    Get all events with pagination and filtering
// @route   GET /api/mobile/events
// @access  Private
router.get('/events', protectMobile, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Build filter object - show all events (past, current, and future)
    const whereClause = { 
      isPublic: true,
      isActive: true
      // Removed date filter to include old events
    };
    
    if (req.query.type) {
      whereClause.type = req.query.type;
    }
    
    if (req.query.city) {
      whereClause.city = {
        [Op.iLike]: `%${req.query.city}%`
      };
    }

    // Build search query
    if (req.query.search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${req.query.search}%` } },
        { description: { [Op.iLike]: `%${req.query.search}%` } },
        { contactPerson: { [Op.iLike]: `%${req.query.search}%` } }
      ];
    }

    const events = await Event.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['createdBy', 'updatedBy'] },
      order: [['startDate', 'ASC']], // Sort by start date ascending
      offset,
      limit
    });

    res.status(200).json({
      success: true,
      count: events.rows.length,
      total: events.count,
      page,
      pages: Math.ceil(events.count / limit),
      events: events.rows
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
// @route   GET /api/mobile/events/upcoming
// @access  Private
router.get('/events/upcoming', protectMobile, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const whereClause = {
      isPublic: true,
      isActive: true
      // Removed date filter to include old events
    };

    const events = await Event.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['createdBy', 'updatedBy'] },
      order: [['startDate', 'ASC']],
      offset,
      limit,
      include: [{
        model: Association,
        as: 'association',
        attributes: ['name']
      }]
    });

    res.status(200).json({
      success: true,
      count: events.rows.length,
      total: events.count,
      page,
      pages: Math.ceil(events.count / limit),
      events: events.rows
    });

  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching upcoming events'
    });
  }
});

// @desc    Get past events
// @route   GET /api/mobile/events/past
// @access  Private
router.get('/events/past', protectMobile, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const now = new Date();
    const whereClause = {
      isPublic: true,
      isActive: true,
      startDate: { [Op.lt]: now } // Only past events
    };
    
    if (req.query.type) {
      whereClause.type = req.query.type;
    }
    
    if (req.query.city) {
      whereClause.city = {
        [Op.iLike]: `%${req.query.city}%`
      };
    }

    // Build search query
    if (req.query.search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${req.query.search}%` } },
        { description: { [Op.iLike]: `%${req.query.search}%` } },
        { contactPerson: { [Op.iLike]: `%${req.query.search}%` } }
      ];
    }

    const events = await Event.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['createdBy', 'updatedBy'] },
      order: [['startDate', 'DESC']], // Sort by start date descending (most recent first)
      offset,
      limit,
      include: [{
        model: Association,
        as: 'association',
        attributes: ['name']
      }]
    });

    res.status(200).json({
      success: true,
      count: events.rows.length,
      total: events.count,
      page,
      pages: Math.ceil(events.count / limit),
      events: events.rows
    });

  } catch (error) {
    console.error('Get past events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching past events'
    });
  }
});

// @desc    Search events
// @route   GET /api/mobile/events/search
// @access  Private
router.get('/events/search', protectMobile, async (req, res) => {
  try {
    const { q, type, city } = req.query;
    
    if (!q && !type && !city) {
      return res.status(400).json({
        success: false,
        message: 'Please provide search criteria'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Build search query - show all events (past, current, and future)
    const whereClause = { 
      isPublic: true,
      isActive: true
      // Removed date filter to include old events
    };
    
    if (q) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${q}%` } },
        { description: { [Op.iLike]: `%${q}%` } },
        { contactPerson: { [Op.iLike]: `%${q}%` } }
      ];
    }
    
    if (type) {
      whereClause.type = type;
    }
    
    if (city) {
      whereClause.city = { [Op.iLike]: `%${city}%` };
    }

    const events = await Event.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['createdBy', 'updatedBy'] },
      order: [['startDate', 'ASC']],
      offset,
      limit,
      include: [{
        model: Association,
        as: 'association',
        attributes: ['name']
      }]
    });

    res.status(200).json({
      success: true,
      count: events.rows.length,
      total: events.count,
      page,
      pages: Math.ceil(events.count / limit),
      events: events.rows
    });

  } catch (error) {
    console.error('Search events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching events'
    });
  }
});

// @desc    Get event statistics
// @route   GET /api/mobile/events/stats
// @access  Private
router.get('/events/stats', protectMobile, async (req, res) => {
  try {
    const now = new Date();
    
    const totalEvents = await Event.count({
      where: { isPublic: true }
    });

    const upcomingEvents = await Event.count({
      where: {
        isPublic: true,
        startDate: { [Op.gte]: now },
        isActive: true
      }
    });

    const pastEvents = await Event.count({
      where: {
        isPublic: true,
        startDate: { [Op.lt]: now },
        isActive: true
      }
    });

    // Get event types with counts using a simpler approach
    const allEvents = await Event.findAll({
      where: { isPublic: true },
      attributes: ['type']
    });

    // Count events by type
    const eventTypeCounts = {};
    allEvents.forEach(event => {
      eventTypeCounts[event.type] = (eventTypeCounts[event.type] || 0) + 1;
    });

    // Convert to array format
    const eventTypes = Object.entries(eventTypeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    res.status(200).json({
      success: true,
      stats: {
        totalEvents,
        upcomingEvents,
        pastEvents,
        ongoingEvents: 0,
        completedEvents: pastEvents
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

// @desc    Get specific event details
// @route   GET /api/mobile/events/:id
// @access  Private
router.get('/events/:id', protectMobile, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate integer ID format
    if (!id.match(/^\d+$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID format'
      });
    }

    const event = await Event.findByPk(id, {
      attributes: { exclude: ['createdBy', 'updatedBy'] },
      include: [{
        model: Association,
        as: 'association',
        attributes: ['name']
      }]
    });

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

module.exports = router;
