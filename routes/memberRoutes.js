const express = require('express');
const { body, validationResult, query } = require('express-validator');
const Member = require('../models/Member');
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
  query('businessType').optional().isIn(['sound', 'decorator', 'catering', 'generator', 'madap', 'light']),
  query('associationName').optional().isString().trim(),
  query('sortBy').optional().isIn(['name', 'businessName', 'city', 'businessType', 'createdAt']),
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
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};

    // Apply search filters
    if (search) {
      filter.$text = { $search: search };
    }

    if (city) {
      filter.city = city;
    }

    if (state) {
      filter.state = state;
    }

    if (businessType) {
      filter.businessType = businessType;
    }

    if (associationName) {
      filter.associationName = associationName;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const members = await Member.find(filter)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Member.countDocuments(filter);

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
    const member = await Member.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

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
  body('phone', 'Phone number is required').matches(/^[0-9]{10}$/),
  body('state', 'State is required').notEmpty().trim(),
  body('businessType', 'Business type is required').isIn(['sound', 'decorator', 'catering', 'generator', 'madap', 'light']),
  body('city', 'City is required').notEmpty().trim(),
  body('pincode', 'Pincode is required').matches(/^[0-9]{6}$/),
  body('associationName', 'Association name is required').notEmpty().trim()
], authorize('admin'), async (req, res) => {
  try {
    console.log('Member POST request received:', req.body);
    console.log('User:', req.user);
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // Add createdBy and updatedBy
    req.body.createdBy = req.user._id;
    req.body.updatedBy = req.user._id;

    // Create member
    const member = await Member.create(req.body);

    // Populate createdBy field
    await member.populate('createdBy', 'name email');

    res.status(201).json({
      success: true,
      member
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
  body('businessType').optional().isIn(['sound', 'decorator', 'catering', 'generator', 'madap', 'light']).withMessage('Invalid business type'),
  body('city').optional().notEmpty().trim().withMessage('City cannot be empty'),
  body('pincode').optional().matches(/^[0-9]{6}$/).withMessage('Invalid pincode'),
  body('associationName').optional().notEmpty().trim().withMessage('Association name cannot be empty')
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
    const existingMember = await Member.findById(req.params.id);
    if (!existingMember) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Add updatedBy
    req.body.updatedBy = req.user._id;

    // Update member
    const member = await Member.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'name email')
     .populate('updatedBy', 'name email');

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
    const member = await Member.findById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    await member.deleteOne();

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
    const totalMembers = await Member.countDocuments();
    const activeMembers = await Member.countDocuments({ isActive: true });
    const inactiveMembers = await Member.countDocuments({ isActive: false });

    // Get business type distribution
    const businessTypeStats = await Member.aggregate([
      { $group: { _id: '$businessType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get city distribution
    const cityStats = await Member.aggregate([
      { $group: { _id: '$city', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get state distribution
    const stateStats = await Member.aggregate([
      { $group: { _id: '$state', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get association distribution
    const associationStats = await Member.aggregate([
      { $group: { _id: '$associationName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Get recent additions
    const recentMembers = await Member.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name businessName businessType city createdAt');

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
