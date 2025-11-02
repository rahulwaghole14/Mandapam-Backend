const express = require('express');
const { Event, EventRegistration, Member } = require('../models');
const EventExhibitor = require('../models/EventExhibitor');
const paymentService = require('../services/paymentService');
const qrService = require('../services/qrService');
const { Op, sequelize } = require('sequelize');
const { protectMobile } = require('../middleware/mobileAuthMiddleware');
const RSVPService = require('../services/rsvpService');

const router = express.Router();

// @desc    Get all events with pagination and filtering
// @route   GET /api/mobile/events
// @access  Public
router.get('/events', async (req, res) => {
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

    // Build include array - only include registrations if user is authenticated
    const includeArray = [];
    if (req.user && req.user.id) {
      includeArray.push({
        model: EventRegistration,
        as: 'registrations',
        where: { memberId: req.user.id },
        required: false,
        attributes: ['id', 'status', 'registeredAt']
      });
    }

    const events = await Event.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['createdBy', 'updatedBy'] },
      order: [['startDate', 'ASC']], // Sort by start date ascending
      offset,
      limit,
      include: includeArray
    });

    // Transform events to include RSVP status
    const eventsWithRSVP = events.rows.map(event => {
      const eventData = event.toJSON();
      
      // Only show RSVP status if user is authenticated
      if (req.user && req.user.id) {
        const isRegistered = eventData.registrations && eventData.registrations.length > 0;
        const registration = isRegistered ? eventData.registrations[0] : null;
        
        // Remove registrations array from response (we only need the status)
        delete eventData.registrations;
        
        return {
          ...eventData,
          isRegistered,
          registrationStatus: registration ? registration.status : null,
          registeredAt: registration ? registration.registeredAt : null,
          canRegister: RSVPService.isEventUpcoming(event) && 
                       (!event.maxAttendees || event.currentAttendees < event.maxAttendees)
        };
      } else {
        // No user authentication - return basic event data
        delete eventData.registrations;
        return {
          ...eventData,
          isRegistered: false,
          registrationStatus: null,
          registeredAt: null,
          canRegister: false // Can't register without authentication
        };
      }
    });

    res.status(200).json({
      success: true,
      count: events.rows.length,
      total: events.count,
      page,
      pages: Math.ceil(events.count / limit),
      events: eventsWithRSVP
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
// @access  Public
router.get('/events/upcoming', async (req, res) => {
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
      // Removed Association include as Event model doesn't have this association
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
      // Removed Association include as Event model doesn't have this association
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
      // Removed Association include as Event model doesn't have this association
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
// @access  Public
router.get('/events/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate integer ID format
    if (!id.match(/^\d+$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID format'
      });
    }

    const event = await Event.findOne({
      where: {
        id: id,
        isPublic: true,
        isActive: true
      },
      attributes: { exclude: ['createdBy', 'updatedBy'] },
      include: [{ model: EventExhibitor, as: 'exhibitors' }]
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

// Payments and Registration flow
// @desc    Create Razorpay order for event registration
// @route   POST /api/mobile/events/:id/register-payment
// @access  Private
router.post('/events/:id/register-payment', protectMobile, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);
    const memberId = req.user.id;
    
    if (isNaN(eventId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid event ID' 
      });
    }
    
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found' 
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

    // Get member details for prefill
    const member = await Member.findByPk(memberId);
    
    const order = await paymentService.createOrder(fee, `evt_${eventId}_mem_${memberId}_${Date.now()}`);
    
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
      // Note: handler and modal.ondismiss should be set on frontend
      notes: {
        eventId: eventId.toString(),
        memberId: memberId.toString(),
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

// @desc    Confirm payment and create registration
// @route   POST /api/mobile/events/:id/confirm-payment
// @access  Private
router.post('/events/:id/confirm-payment', protectMobile, async (req, res) => {
  try {
    const eventId = parseInt(req.params.id, 10);
    const memberId = req.user.id;
    
    if (isNaN(eventId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid event ID' 
      });
    }
    
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, notes } = req.body;

    // Get event first to check if it exists and if it requires payment
    const event = await Event.findByPk(eventId);
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

    const amountPaid = fee;

    // Upsert registration with paid status
    let registration = await EventRegistration.findOne({ where: { eventId, memberId } });
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
        memberId,
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

// @desc    Get my registrations with QR codes
// @route   GET /api/mobile/my/events
// @access  Private
router.get('/my/events', protectMobile, async (req, res) => {
  try {
    const memberId = req.user.id;
    const regs = await EventRegistration.findAll({
      where: { memberId },
      include: [{ model: Event, as: 'event', include: [{ model: EventExhibitor, as: 'exhibitors' }] }],
      order: [['registeredAt', 'DESC']]
    });

    const items = await Promise.all(regs.map(async r => ({
      id: r.id,
      event: r.event,
      status: r.status,
      paymentStatus: r.paymentStatus,
      registeredAt: r.registeredAt,
      attendedAt: r.attendedAt,
      qrDataURL: await qrService.generateQrDataURL(r)
    })));

    res.json({ success: true, registrations: items });
  } catch (error) {
    console.error('My events error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching my events' });
  }
});

// @desc    Get QR code for a registration
// @route   GET /api/mobile/registrations/:id/qr
// @access  Private
router.get('/registrations/:id/qr', protectMobile, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const reg = await EventRegistration.findByPk(id);
    if (!reg || reg.memberId !== req.user.id) return res.status(404).json({ success: false, message: 'Registration not found' });
    const dataUrl = await qrService.generateQrDataURL(reg);
    res.json({ success: true, qrDataURL: dataUrl });
  } catch (error) {
    console.error('Get QR error:', error);
    res.status(500).json({ success: false, message: 'Server error while generating QR' });
  }
});

// @desc    Register for an event (RSVP)
// @route   POST /api/mobile/events/:id/rsvp
// @access  Private
router.post('/events/:id/rsvp', protectMobile, async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const { id: memberId } = req.user;
    const { notes } = req.body;

    // Validate event ID
    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID'
      });
    }

    // Register for event using RSVP service
    const registration = await RSVPService.registerForEvent(eventId, memberId, notes);

    res.status(201).json({
      success: true,
      message: 'Successfully registered for event',
      registration: {
        id: registration.id,
        eventId: registration.eventId,
        memberId: registration.memberId,
        status: registration.status,
        registeredAt: registration.registeredAt,
        notes: registration.notes
      }
    });

  } catch (error) {
    console.error('RSVP registration error:', error);
    
    if (error.message.includes('not found') || error.message.includes('Cannot register') || 
        error.message.includes('already registered') || error.message.includes('full capacity')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while registering for event'
    });
  }
});

// @desc    Cancel event registration
// @route   DELETE /api/mobile/events/:id/rsvp
// @access  Private
router.delete('/events/:id/rsvp', protectMobile, async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const { id: memberId } = req.user;

    // Validate event ID
    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID'
      });
    }

    // Cancel registration using RSVP service
    const registration = await RSVPService.cancelRegistration(eventId, memberId);

    res.status(200).json({
      success: true,
      message: 'Successfully cancelled event registration',
      registration: {
        id: registration.id,
        eventId: registration.eventId,
        memberId: registration.memberId,
        status: registration.status,
        registeredAt: registration.registeredAt
      }
    });

  } catch (error) {
    console.error('RSVP cancellation error:', error);
    
    if (error.message.includes('No active registration')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while cancelling registration'
    });
  }
});

// @desc    Check registration status for an event
// @route   GET /api/mobile/events/:id/rsvp
// @access  Private
router.get('/events/:id/rsvp', protectMobile, async (req, res) => {
  try {
    const { id: eventId } = req.params;
    const { id: memberId } = req.user;

    // Validate event ID
    if (!eventId || isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid event ID'
      });
    }

    // Get registration status using RSVP service
    const registration = await RSVPService.getRegistrationStatus(eventId, memberId);

    if (!registration) {
      return res.status(200).json({
        success: true,
        isRegistered: false,
        message: 'Not registered for this event'
      });
    }

    res.status(200).json({
      success: true,
      isRegistered: true,
      registration: {
        id: registration.id,
        eventId: registration.eventId,
        memberId: registration.memberId,
        status: registration.status,
        registeredAt: registration.registeredAt,
        notes: registration.notes,
        event: registration.event ? {
          id: registration.event.id,
          title: registration.event.title,
          startDate: registration.event.startDate,
          status: registration.event.status
        } : null
      }
    });

  } catch (error) {
    console.error('RSVP status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking registration status'
    });
  }
});

// @desc    Get member's event registrations
// @route   GET /api/mobile/events/my-registrations
// @access  Private
router.get('/events/my-registrations', protectMobile, async (req, res) => {
  try {
    const { id: memberId } = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status; // Optional filter by status

    // Get member registrations using RSVP service
    const result = await RSVPService.getMemberRegistrations(memberId, {
      status,
      limit,
      offset,
      includeEvent: true
    });

    // Transform data for mobile app
    const transformedRegistrations = result.rows.map(registration => ({
      id: registration.id,
      eventId: registration.eventId,
      status: registration.status,
      registeredAt: registration.registeredAt,
      notes: registration.notes,
      event: registration.event ? {
        id: registration.event.id,
        title: registration.event.title,
        description: registration.event.description,
        startDate: registration.event.startDate,
        endDate: registration.event.endDate,
        location: registration.event.location,
        status: registration.event.status,
        maxAttendees: registration.event.maxAttendees,
        currentAttendees: registration.event.currentAttendees
      } : null
    }));

    res.status(200).json({
      success: true,
      registrations: transformedRegistrations,
      total: result.count,
      page,
      limit,
      hasNextPage: (page * limit) < result.count
    });

  } catch (error) {
    console.error('Get member registrations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching registrations'
    });
  }
});

module.exports = router;
