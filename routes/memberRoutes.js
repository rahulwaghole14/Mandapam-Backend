const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const Member = require('../models/Member');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply protection to all routes
router.use(protect);

// @desc    Get all members with filtering and pagination
// @route   GET /api/members
// @access  Private
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().trim(),
  query('city').optional().isString().trim(),
  query('state').optional().isString().trim(),
  query('businessType').optional().isIn(['catering', 'sound', 'mandap', 'light', 'decorator', 'photography', 'videography', 'transport', 'other']),
  query('associationName').optional().isString().trim(),
  query('sortBy').optional().isIn(['name', 'businessName', 'city', 'businessType', 'created_at']),
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
      city,
      state,
      businessType,
      associationName,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const where = {};

    // Apply search filters
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { businessName: { [Op.iLike]: `%${search}%` } },
        { city: { [Op.iLike]: `%${search}%` } },
        { associationName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (city) {
      const citySearchConditions = [
        { district: city },
        { city: city }
      ];
      
      if (where[Op.or]) {
        // If there's already an Op.or condition, combine them
        where[Op.and] = [
          { [Op.or]: where[Op.or] },
          { [Op.or]: citySearchConditions }
        ];
        delete where[Op.or];
      } else {
        where[Op.or] = citySearchConditions;
      }
    }

    if (state) {
      where.state = state;
    }

    if (businessType) {
      where.businessType = businessType;
    }

    if (associationName) {
      where.associationName = associationName;
    }

    // Build sort object
    const order = [];
    if (sortBy === 'created_at') {
      order.push(['created_at', sortOrder.toUpperCase()]);
    } else {
      order.push([sortBy, sortOrder.toUpperCase()]);
    }

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const { count, rows: members } = await Member.findAndCountAll({
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
      count: members.length,
      total,
      page: parseInt(page),
      totalPages,
      hasNextPage,
      hasPrevPage,
      members
    });

  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching members'
    });
  }
});

// @desc    Get single member
// @route   GET /api/members/:id
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id, {
      include: [
        { model: User, as: 'createdByUser', attributes: ['name', 'email'] },
        { model: User, as: 'updatedByUser', attributes: ['name', 'email'] }
      ]
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    res.status(200).json({
      success: true,
      member
    });

  } catch (error) {
    console.error('Get member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching member'
    });
  }
});

// @desc    Create new member
// @route   POST /api/members
// @access  Private (Admin only)
router.post('/', [
  body('name', 'Member name is required').notEmpty().trim(),
  body('businessName', 'Business name is required').notEmpty().trim(),
  body('phone', 'Phone number is required').matches(/^[0-9]{10}$/).withMessage('Phone number must be exactly 10 digits'),
  body('state', 'State is required').notEmpty().trim(),
  body('businessType', 'Business type is required').isIn(['catering', 'sound', 'mandap', 'light', 'decorator', 'photography', 'videography', 'transport', 'other']),
  body('city', 'City is required').notEmpty().trim(),
  body('pincode', 'Pincode is required').matches(/^[0-9]{6}$/),
  body('associationName', 'Association name is required').notEmpty().trim(),
  body('birthDate').optional().isISO8601().withMessage('Birth date must be a valid date'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('address').optional().custom((value) => {
    if (!value || value === '' || value === null || value === undefined) return true; // Allow empty values
    return value.length <= 500;
  }).withMessage('Address cannot exceed 500 characters'),
  body('gstNumber').optional().custom((value) => {
    if (!value || value === '' || value === null || value === undefined) return true; // Allow empty values
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value);
  }).withMessage('Please provide a valid GST number'),
  body('description').optional().custom((value) => {
    if (!value || value === '' || value === null || value === undefined) return true; // Allow empty values
    return value.length <= 1000;
  }).withMessage('Description cannot exceed 1000 characters'),
  body('experience').optional().custom((value) => {
    if (value === '' || value === null || value === undefined) return true; // Allow empty values
    const num = parseInt(value);
    return !isNaN(num) && num >= 0 && num <= 100;
  }).withMessage('Experience must be between 0 and 100 years'),
  body('profileImage').optional().custom((value) => {
    if (!value || value === '' || value === null || value === undefined) return true; // Allow empty values
    return value.length <= 255;
  }).withMessage('Profile image URL cannot exceed 255 characters'),
  body('businessImages').optional().custom((value) => {
    if (!value || value === null || value === undefined) return true; // Allow empty values
    return Array.isArray(value);
  }).withMessage('Business images must be an array')
], authorize('admin'), async (req, res) => {
  try {
    console.log('Member POST request received:', req.body);
    console.log('User:', req.user);
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      console.log('Request body received:', req.body);
      console.log('Request body types:', {
        name: typeof req.body.name,
        businessName: typeof req.body.businessName,
        phone: typeof req.body.phone,
        state: typeof req.body.state,
        businessType: typeof req.body.businessType,
        city: typeof req.body.city,
        pincode: typeof req.body.pincode,
        associationName: typeof req.body.associationName,
        birthDate: typeof req.body.birthDate,
        email: typeof req.body.email,
        address: typeof req.body.address,
        gstNumber: typeof req.body.gstNumber,
        description: typeof req.body.description,
        experience: typeof req.body.experience,
        profileImage: typeof req.body.profileImage,
        businessImages: typeof req.body.businessImages
      });
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Look up association ID if associationName is provided
    if (req.body.associationName && !req.body.associationId) {
      const Association = require('../models/Association');
      const association = await Association.findOne({ 
        where: { name: req.body.associationName } 
      });
      
      if (!association) {
        return res.status(400).json({
          success: false,
          message: `Association "${req.body.associationName}" not found`
        });
      }
      
      req.body.associationId = association.id;
    }

    // Add createdBy and updatedBy (only if user exists)
    if (req.user && req.user.id) {
      req.body.createdBy = req.user.id;
      req.body.updatedBy = req.user.id;
    }

    // Create member
    const member = await Member.create(req.body);

    // Get member with populated fields
    const memberWithDetails = await Member.findByPk(member.id);

    res.status(201).json({
      success: true,
      member: memberWithDetails
    });

  } catch (error) {
    console.error('Create member error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // Handle duplicate key error
    if (error.code === 11000) {
      console.log('=== DUPLICATE KEY ERROR DETAILS (CREATE) ===');
      console.log('Error code:', error.code);
      console.log('Error keyValue:', error.keyValue);
      console.log('Error message:', error.message);
      console.log('Full error object:', JSON.stringify(error, null, 2));
      
      let duplicateField = 'unknown field';
      if (error.keyValue) {
        duplicateField = Object.keys(error.keyValue)[0];
        console.log('Duplicate field identified:', duplicateField);
        console.log('Duplicate value:', error.keyValue[duplicateField]);
      }
      
      return res.status(400).json({
        success: false,
        message: `Member with this ${duplicateField} already exists`,
        debug: {
          duplicateField,
          duplicateValue: error.keyValue ? error.keyValue[duplicateField] : null
        }
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating member'
    });
  }
});

// @desc    Update member
// @route   PUT /api/members/:id
// @access  Private (Admin only)
router.put('/:id', [
  body('name').optional().notEmpty().trim().withMessage('Name cannot be empty'),
  body('businessName').optional().notEmpty().trim().withMessage('Business name cannot be empty'),
  body('phone').optional().matches(/^[0-9]{10}$/).withMessage('Invalid phone number'),
  body('state').optional().notEmpty().trim().withMessage('State cannot be empty'),
  body('businessType').optional().isIn(['catering', 'sound', 'mandap', 'light', 'decorator', 'photography', 'videography', 'transport', 'other']).withMessage('Invalid business type'),
  body('city').optional().notEmpty().trim().withMessage('City cannot be empty'),
  body('pincode').optional().matches(/^[0-9]{6}$/).withMessage('Invalid pincode'),
  body('associationName').optional().notEmpty().trim().withMessage('Association name cannot be empty'),
  body('birthDate').optional().isISO8601().withMessage('Birth date must be a valid date'),
  body('email').optional().isEmail().withMessage('Please provide a valid email'),
  body('address').optional().custom((value) => {
    if (!value || value === '' || value === null || value === undefined) return true; // Allow empty values
    return value.length <= 500;
  }).withMessage('Address cannot exceed 500 characters'),
  body('gstNumber').optional().custom((value) => {
    if (!value || value === '' || value === null || value === undefined) return true; // Allow empty values
    return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(value);
  }).withMessage('Please provide a valid GST number'),
  body('description').optional().custom((value) => {
    if (!value || value === '' || value === null || value === undefined) return true; // Allow empty values
    return value.length <= 1000;
  }).withMessage('Description cannot exceed 1000 characters'),
  body('experience').optional().custom((value) => {
    if (value === '' || value === null || value === undefined) return true; // Allow empty values
    const num = parseInt(value);
    return !isNaN(num) && num >= 0 && num <= 100;
  }).withMessage('Experience must be between 0 and 100 years'),
  body('profileImage').optional().custom((value) => {
    if (!value || value === '' || value === null || value === undefined) return true; // Allow empty values
    return value.length <= 255;
  }).withMessage('Profile image URL cannot exceed 255 characters'),
  body('businessImages').optional().custom((value) => {
    if (!value || value === null || value === undefined) return true; // Allow empty values
    return Array.isArray(value);
  }).withMessage('Business images must be an array')
], authorize('admin'), async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Find member first
    const existingMember = await Member.findByPk(req.params.id);
    if (!existingMember) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Look up association ID if associationName is provided
    if (req.body.associationName && !req.body.associationId) {
      const Association = require('../models/Association');
      const association = await Association.findOne({ 
        where: { name: req.body.associationName } 
      });
      
      if (!association) {
        return res.status(400).json({
          success: false,
          message: `Association "${req.body.associationName}" not found`
        });
      }
      
      req.body.associationId = association.id;
    }

    // Add updatedBy
    req.body.updatedBy = req.user.id;

    // Update member
    await existingMember.update(req.body);

    // Get updated member with populated fields
    const member = await Member.findByPk(req.params.id, {
      include: [
        { model: User, as: 'createdByUser', attributes: ['name', 'email'] },
        { model: User, as: 'updatedByUser', attributes: ['name', 'email'] }
      ]
    });

    res.status(200).json({
      success: true,
      member
    });

  } catch (error) {
    console.error('Update member error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      console.log('=== DUPLICATE KEY ERROR DETAILS (UPDATE) ===');
      console.log('Error code:', error.code);
      console.log('Error keyValue:', error.keyValue);
      console.log('Error message:', error.message);
      console.log('Full error object:', JSON.stringify(error, null, 2));
      
      let duplicateField = 'unknown field';
      if (error.keyValue) {
        duplicateField = Object.keys(error.keyValue)[0];
        console.log('Duplicate field identified:', duplicateField);
        console.log('Duplicate value:', error.keyValue[duplicateField]);
      }
      
      return res.status(400).json({
        success: false,
        message: `Member with this ${duplicateField} already exists`,
        debug: {
          duplicateField,
          duplicateValue: error.keyValue ? error.keyValue[duplicateField] : null
        }
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating member'
    });
  }
});

// @desc    Delete member
// @route   DELETE /api/members/:id
// @access  Private (Admin only)
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    await member.destroy();

    res.status(200).json({
      success: true,
      message: 'Member deleted successfully'
    });

  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting member'
    });
  }
});

// @desc    Get member statistics
// @route   GET /api/members/stats/overview
// @access  Private
router.get('/stats/overview', async (req, res) => {
  try {
    // Get counts
    const totalMembers = await Member.count();
    const activeMembers = await Member.count({ where: { isActive: true } });
    const inactiveMembers = await Member.count({ where: { isActive: false } });

    // Get business type distribution
    const businessTypeStats = await Member.findAll({
      attributes: [
        'businessType',
        [Member.sequelize.fn('COUNT', Member.sequelize.col('id')), 'count']
      ],
      group: ['businessType'],
      order: [[Member.sequelize.fn('COUNT', Member.sequelize.col('id')), 'DESC']],
      raw: true
    });

    // Get city distribution
    const cityStats = await Member.findAll({
      attributes: [
        'city',
        [Member.sequelize.fn('COUNT', Member.sequelize.col('id')), 'count']
      ],
      group: ['city'],
      order: [[Member.sequelize.fn('COUNT', Member.sequelize.col('id')), 'DESC']],
      limit: 10,
      raw: true
    });

    // Get state distribution
    const stateStats = await Member.findAll({
      attributes: [
        'state',
        [Member.sequelize.fn('COUNT', Member.sequelize.col('id')), 'count']
      ],
      group: ['state'],
      order: [[Member.sequelize.fn('COUNT', Member.sequelize.col('id')), 'DESC']],
      raw: true
    });

    // Get association distribution
    const associationStats = await Member.findAll({
      attributes: [
        'associationName',
        [Member.sequelize.fn('COUNT', Member.sequelize.col('id')), 'count']
      ],
      group: ['associationName'],
      order: [[Member.sequelize.fn('COUNT', Member.sequelize.col('id')), 'DESC']],
      limit: 10,
      raw: true
    });

    // Get recent additions
    const recentMembers = await Member.findAll({
      attributes: ['name', 'businessName', 'businessType', 'city', 'created_at'],
      order: [['created_at', 'DESC']],
      limit: 5
    });

    res.status(200).json({
      success: true,
      stats: {
        total: totalMembers,
        active: activeMembers,
        inactive: inactiveMembers,
        businessTypes: businessTypeStats,
        topCities: cityStats,
        stateStats: stateStats,
        topAssociations: associationStats,
        recent: recentMembers
      }
    });

  } catch (error) {
    console.error('Get member stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching member statistics'
    });
  }
});



module.exports = router;
