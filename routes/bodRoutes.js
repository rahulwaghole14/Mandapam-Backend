const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const BOD = require('../models/BOD');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply protection to all routes
router.use(protect);

// @desc    Get all BOD members with filtering and pagination
// @route   GET /api/bod
// @access  Private
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().trim(),
  query('designation').optional().isString().trim(),
  query('isActive').optional().isBoolean(),
  query('type').optional().isIn(['association', 'national']).withMessage('Type must be either association or national'),
  query('associationId').optional().isInt({ min: 1 }).withMessage('Association ID must be a positive integer'),
  query('sortBy').optional().isIn(['name', 'designation', 'dateOfJoining', 'created_at']),
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
      designation,
      isActive,
      type,
      associationId,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const where = {};

    // Apply search filters
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { designation: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (designation) {
      where.designation = designation;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Apply BOD type filtering
    if (type === 'association') {
      if (associationId) {
        where.associationId = parseInt(associationId);
      } else {
        // If type is association but no associationId provided, get all association BODs
        where.associationId = { [Op.ne]: null };
      }
    } else if (type === 'national') {
      // National BODs have null associationId
      where.associationId = null;
    } else if (associationId) {
      // If associationId is provided without type, filter by specific association
      where.associationId = parseInt(associationId);
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
    const { count, rows: bods } = await BOD.findAndCountAll({
      where,
      include: [
        // Note: BOD model doesn't have createdBy/updatedBy fields
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

    // Build response object
    const response = {
      success: true,
      count: bods.length,
      total,
      page: parseInt(page),
      totalPages,
      hasNextPage,
      hasPrevPage,
      bods
    };

    // Add type and associationId to response when filters are applied
    if (type) {
      response.type = type;
    }
    if (associationId) {
      response.associationId = parseInt(associationId);
    }

    res.status(200).json(response);

  } catch (error) {
    console.error('Get BOD members error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching BOD members'
    });
  }
});

// @desc    Get BOD members for a specific association
// @route   GET /api/bod/association/:associationId
// @access  Private
router.get('/association/:associationId', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().trim(),
  query('designation').optional().isString().trim(),
  query('isActive').optional().isBoolean(),
  query('sortBy').optional().isIn(['name', 'designation', 'dateOfJoining', 'created_at']),
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

    const { associationId } = req.params;
    const {
      page = 1,
      limit = 10,
      search,
      designation,
      isActive,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    // Validate associationId
    if (!associationId || isNaN(associationId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid association ID is required'
      });
    }

    // Build filter object
    const where = {
      associationId: parseInt(associationId)
    };

    // Apply search filters
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { designation: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (designation) {
      where.designation = designation;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
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
    const { count, rows: bods } = await BOD.findAndCountAll({
      where,
      include: [],
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
      count: bods.length,
      total,
      page: parseInt(page),
      totalPages,
      hasNextPage,
      hasPrevPage,
      associationId: parseInt(associationId),
      type: 'association',
      bods
    });

  } catch (error) {
    console.error('Get Association BOD members error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching association BOD members'
    });
  }
});

// @desc    Get National BOD members (where associationId is null)
// @route   GET /api/bod/national
// @access  Private
router.get('/national', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().trim(),
  query('designation').optional().isString().trim(),
  query('isActive').optional().isBoolean(),
  query('sortBy').optional().isIn(['name', 'designation', 'dateOfJoining', 'created_at']),
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
      designation,
      isActive,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object - National BODs have null associationId
    const where = {
      associationId: null
    };

    // Apply search filters
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { designation: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (designation) {
      where.designation = designation;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
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
    const { count, rows: bods } = await BOD.findAndCountAll({
      where,
      include: [],
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
      count: bods.length,
      total,
      page: parseInt(page),
      totalPages,
      hasNextPage,
      hasPrevPage,
      type: 'national',
      bods
    });

  } catch (error) {
    console.error('Get National BOD members error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching national BOD members'
    });
  }
});

// @desc    Get single BOD member
// @route   GET /api/bod/:id
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const bod = await BOD.findByPk(req.params.id, {
      include: [
        // Note: BOD model doesn't have createdBy/updatedBy fields
      ]
    });

    if (!bod) {
      return res.status(404).json({
        success: false,
        message: 'BOD member not found'
      });
    }

    res.status(200).json({
      success: true,
      bod
    });

  } catch (error) {
    console.error('Get BOD member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching BOD member'
    });
  }
});

// @desc    Create new BOD member
// @route   POST /api/bod
// @access  Private (Admin only)
router.post('/', [
  body('name', 'BOD member name is required').notEmpty().trim(),
  body('designation').optional().isIn([
    'President', 'Vice President', 'Secretary', 'Joint Secretary', 
    'Treasurer', 'Joint Treasurer', 'Executive Member'
  ]).withMessage('Invalid designation'),
  body('position').optional().isIn([
    'President', 'Vice President', 'Secretary', 'Joint Secretary', 
    'Treasurer', 'Joint Treasurer', 'Executive Member'
  ]).withMessage('Invalid position'),
  body('contactNumber').optional().matches(/^[0-9+\-\s()]+$/).withMessage('Invalid contact number'),
  body('phone').optional().matches(/^[0-9+\-\s()]+$/).withMessage('Invalid phone number'),
  body('email', 'Please include a valid email').isEmail(),
  body('address').optional().trim().isLength({ max: 500 }).withMessage('Address cannot exceed 500 characters'),
  body('city').optional().trim().isLength({ max: 100 }).withMessage('City cannot exceed 100 characters'),
  body('state').optional().trim().isLength({ max: 100 }).withMessage('State cannot exceed 100 characters'),
  body('pincode').optional().matches(/^[0-9]{6}$/).withMessage('Pincode must be 6 digits'),
  body('bio').optional().isLength({ max: 500 }),
  body('socialLinks.linkedin').optional().custom(value => {
    if (value === '' || value === null || value === undefined) return true;
    return require('validator').isURL(value);
  }).withMessage('LinkedIn must be a valid URL'),
  body('socialLinks.twitter').optional().custom(value => {
    if (value === '' || value === null || value === undefined) return true;
    return require('validator').isURL(value);
  }).withMessage('Twitter must be a valid URL'),
  body('socialLinks.facebook').optional().custom(value => {
    if (value === '' || value === null || value === undefined) return true;
    return require('validator').isURL(value);
  }).withMessage('Facebook must be a valid URL'),
  body('associationId').optional().isInt({ min: 1 }).withMessage('Association ID must be a positive integer'),
], authorize('admin'), async (req, res) => {
  try {
    console.log('BOD POST request received:', req.body);
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

    // Handle field mapping from frontend to backend
    // Frontend sends 'position' -> Backend expects 'designation'
    // Frontend sends 'phone' -> Backend expects 'contactNumber'
    if (req.body.position && !req.body.designation) {
      req.body.designation = req.body.position;
    }
    if (req.body.phone && !req.body.contactNumber) {
      req.body.contactNumber = req.body.phone;
    }

    // Validate required fields after mapping
    if (!req.body.designation && !req.body.position) {
      return res.status(400).json({
        success: false,
        message: 'Either designation or position is required'
      });
    }
    if (!req.body.contactNumber && !req.body.phone) {
      return res.status(400).json({
        success: false,
        message: 'Either contactNumber or phone is required'
      });
    }

    // Note: BOD model doesn't have createdBy/updatedBy fields

    // Prepare BOD data
    const bodData = {
      ...req.body,
      // For National BODs, associationId should be null
      // For Association BODs, associationId should be provided
      associationId: req.body.associationId || null
    };

    console.log('Creating BOD with data:', bodData);
    console.log('Association ID from request:', req.body.associationId);
    console.log('Final associationId in bodData:', bodData.associationId);

    // Create BOD member
    const bod = await BOD.create(bodData);

    // Get BOD member with populated fields
    const bodWithDetails = await BOD.findByPk(bod.id, {
      include: [
        // Note: BOD model doesn't have createdBy field
      ]
    });

    res.status(201).json({
      success: true,
      bod: bodWithDetails
    });

  } catch (error) {
    console.error('Create BOD member error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'BOD member with this email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating BOD member'
    });
  }
});

// @desc    Update BOD member
// @route   PUT /api/bod/:id
// @access  Private (Admin only)
router.put('/:id', [
  body('name').optional().notEmpty().trim().withMessage('Name cannot be empty'),
  body('designation').optional().isIn([
    'President', 'Vice President', 'Secretary', 'Joint Secretary', 
    'Treasurer', 'Joint Treasurer', 'Executive Member'
  ]).withMessage('Invalid designation'),
  body('position').optional().isIn([
    'President', 'Vice President', 'Secretary', 'Joint Secretary', 
    'Treasurer', 'Joint Treasurer', 'Executive Member'
  ]).withMessage('Invalid position'),
  body('contactNumber').optional().matches(/^[0-9+\-\s()]+$/).withMessage('Invalid contact number'),
  body('phone').optional().matches(/^[0-9+\-\s()]+$/).withMessage('Invalid phone number'),
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('address').optional().trim().isLength({ max: 500 }).withMessage('Address cannot exceed 500 characters'),
  body('city').optional().trim().isLength({ max: 100 }).withMessage('City cannot exceed 100 characters'),
  body('state').optional().trim().isLength({ max: 100 }).withMessage('State cannot exceed 100 characters'),
  body('pincode').optional().matches(/^[0-9]{6}$/).withMessage('Invalid pincode'),
  body('bio').optional().isLength({ max: 500 }),
  body('socialLinks.linkedin').optional().custom(value => {
    if (value === '' || value === null || value === undefined) return true;
    return require('validator').isURL(value);
  }).withMessage('LinkedIn must be a valid URL'),
  body('socialLinks.twitter').optional().custom(value => {
    if (value === '' || value === null || value === undefined) return true;
    return require('validator').isURL(value);
  }).withMessage('Twitter must be a valid URL'),
  body('socialLinks.facebook').optional().custom(value => {
    if (value === null || value === undefined) return true;
    if (value === '') return true;
    return require('validator').isURL(value);
  }).withMessage('Facebook must be a valid URL')
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

    // Find BOD member first
    const existingBOD = await BOD.findByPk(req.params.id);
    if (!existingBOD) {
      return res.status(404).json({
        success: false,
        message: 'BOD member not found'
      });
    }

    // Handle field mapping from frontend to backend
    // Frontend sends 'position' -> Backend expects 'designation'
    // Frontend sends 'phone' -> Backend expects 'contactNumber'
    if (req.body.position && !req.body.designation) {
      req.body.designation = req.body.position;
    }
    if (req.body.phone && !req.body.contactNumber) {
      req.body.contactNumber = req.body.phone;
    }

    // Note: BOD model doesn't have updatedBy field

    // Update BOD member
    await existingBOD.update(req.body);

    // Get updated BOD member with populated fields
    const bod = await BOD.findByPk(req.params.id, {
      include: [
        // Note: BOD model doesn't have createdBy/updatedBy fields
      ]
    });

    res.status(200).json({
      success: true,
      bod
    });

  } catch (error) {
    console.error('Update BOD member error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'BOD member with this email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating BOD member'
    });
  }
});

// @desc    Delete BOD member
// @route   DELETE /api/bod/:id
// @access  Private (Admin only)
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const bod = await BOD.findByPk(req.params.id);

    if (!bod) {
      return res.status(404).json({
        success: false,
        message: 'BOD member not found'
      });
    }

    await bod.destroy();

    res.status(200).json({
      success: true,
      message: 'BOD member deleted successfully'
    });

  } catch (error) {
    console.error('Delete BOD member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting BOD member'
    });
  }
});

// @desc    Get BOD statistics
// @route   GET /api/bod/stats/overview
// @access  Private
router.get('/stats/overview', async (req, res) => {
  try {
    // Get counts
    const totalBODs = await BOD.count();
    const activeBODs = await BOD.count({ where: { isActive: true } });
    const inactiveBODs = await BOD.count({ where: { isActive: false } });

    // Get designation distribution
    const designationStats = await BOD.findAll({
      attributes: [
        'designation',
        [BOD.sequelize.fn('COUNT', BOD.sequelize.col('id')), 'count']
      ],
      group: ['designation'],
      order: [[BOD.sequelize.fn('COUNT', BOD.sequelize.col('id')), 'DESC']],
      raw: true
    });

    // Get recent additions
    const recentBODs = await BOD.findAll({
      attributes: ['name', 'designation', 'created_at'],
      order: [['created_at', 'DESC']],
      limit: 5
    });

    res.status(200).json({
      success: true,
      stats: {
        total: totalBODs,
        active: activeBODs,
        inactive: inactiveBODs,
        designations: designationStats,
        recent: recentBODs
      }
    });

  } catch (error) {
    console.error('Get BOD stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching BOD statistics'
    });
  }
});

// @desc    Toggle BOD member active status
// @route   PUT /api/bod/:id/toggle-status
// @access  Private (Admin only)
router.put('/:id/toggle-status', authorize('admin'), async (req, res) => {
  try {
    const bod = await BOD.findByPk(req.params.id);

    if (!bod) {
      return res.status(404).json({
        success: false,
        message: 'BOD member not found'
      });
    }

    // Toggle status
    const newIsActive = !bod.isActive;
    const updateData = {
      isActive: newIsActive,
      // Note: BOD model doesn't have updatedBy field
    };

    // Set resignation date if deactivating
    if (!newIsActive && !bod.dateOfResignation) {
      updateData.dateOfResignation = new Date();
    } else if (newIsActive) {
      updateData.dateOfResignation = null;
    }

    await bod.update(updateData);

    res.status(200).json({
      success: true,
      bod,
      message: `BOD member ${newIsActive ? 'activated' : 'deactivated'} successfully`
    });

  } catch (error) {
    console.error('Toggle BOD status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while toggling BOD status'
    });
  }
});

module.exports = router;
