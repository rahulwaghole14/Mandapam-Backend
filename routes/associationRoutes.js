const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { protect, authorize } = require('../middleware/authMiddleware');
const Association = require('../models/Association');
const Member = require('../models/Member');
const User = require('../models/User');

// Validation middleware
const validateAssociation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Association name is required and cannot exceed 100 characters'),
  body('city')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('City is required and cannot exceed 50 characters'),
  body('state')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('State is required and cannot exceed 50 characters'),
  body('district')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('District cannot exceed 50 characters'),
  body('pincode')
    .optional()
    .matches(/^[0-9]{6}$/)
    .withMessage('Please enter a valid 6-digit pincode'),
  body('establishedYear')
    .optional()
    .isInt({ min: 1800, max: new Date().getFullYear() + 1 })
    .withMessage('Please enter a valid established year'),
  body('contactPerson')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Contact person name cannot exceed 100 characters'),
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9+\-\s()]{10,15}$/)
    .withMessage('Please enter a valid phone number'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please enter a valid email address'),
  body('website')
    .optional()
    .trim()
    .matches(/^https?:\/\/.+/)
    .withMessage('Please enter a valid website URL starting with http:// or https://'),
  body('socialLinks.linkedin')
    .optional()
    .trim()
    .custom(value => {
      if (value && value !== '' && !/^https?:\/\/.+/.test(value)) {
        throw new Error('Please enter a valid LinkedIn URL starting with http:// or https://');
      }
      return true;
    }),
  body('socialLinks.twitter')
    .optional()
    .trim()
    .custom(value => {
      if (value && value !== '' && !/^https?:\/\/.+/.test(value)) {
        throw new Error('Please enter a valid Twitter URL starting with http:// or https://');
      }
      return true;
    }),
  body('socialLinks.facebook')
    .optional()
    .trim()
    .custom(value => {
      if (value && value !== '' && !/^https?:\/\/.+/.test(value)) {
        throw new Error('Please enter a valid Facebook URL starting with http:// or https://');
      }
      return true;
    }),
  body('logo')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Logo URL cannot exceed 500 characters')
];

// @desc    Create new association
// @route   POST /api/associations
// @access  Private (Admin, Sub-Admin)
router.post('/', protect, authorize(['admin', 'sub-admin']), validateAssociation, async (req, res) => {
  try {
    console.log('Association POST request received:', req.body);
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      console.log('Request body received:', req.body);
      console.log('Request body types:', {
        name: typeof req.body.name,
        city: typeof req.body.city,
        state: typeof req.body.state,
        pincode: typeof req.body.pincode,
        establishedYear: typeof req.body.establishedYear,
        address: typeof req.body.address
      });
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const associationData = {
      name: req.body.name,
      address: req.body.address || '',
      city: req.body.city,
      district: req.body.district || undefined,
      state: req.body.state,
      pincode: req.body.pincode,
      establishedYear: req.body.establishedYear,
      contactPerson: req.body.contactPerson || undefined,
      phone: req.body.phone || undefined,
      email: req.body.email || undefined,
      website: req.body.website || undefined,
      socialLinks: {
        linkedin: req.body.socialLinks?.linkedin || undefined,
        twitter: req.body.socialLinks?.twitter || undefined,
        facebook: req.body.socialLinks?.facebook || undefined
      },
      logo: req.body.logo || undefined
    };

    const association = await Association.create(associationData);

    res.status(201).json({
      success: true,
      message: 'Association created successfully',
      association
    });
  } catch (error) {
    console.error('Error creating association:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// @desc    Get all associations with filtering, pagination, and search
// @route   GET /api/associations
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      city = '',
      state = '',
      status = '',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const where = {};
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (city) {
      const citySearchConditions = [
        { district: { [Op.iLike]: `%${city}%` } },
        { city: { [Op.iLike]: `%${city}%` } }
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
    if (state) where['address.state'] = state;
    if (status) where.status = status;

    // Build sort object
    const order = [];
    if (sortBy === 'created_at') {
      order.push(['created_at', sortOrder.toUpperCase()]);
    } else {
      order.push([sortBy, sortOrder.toUpperCase()]);
    }

    // Execute query with pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const { count, rows: associations } = await Association.findAndCountAll({
      where,
      order,
      offset,
      limit: parseInt(limit)
    });

    // Calculate actual member count for each association
    const associationsWithMemberCount = await Promise.all(
      associations.map(async (association) => {
        const actualMemberCount = await Member.count({
          where: { associationName: association.name }
        });
        
        return {
          ...association.toJSON(),
          totalMembers: actualMemberCount
        };
      })
    );

    const total = count;
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      associations: associationsWithMemberCount,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        total,
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching associations:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// @desc    Get single association by ID
// @route   GET /api/associations/:id
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const association = await Association.findByPk(req.params.id);
    
    if (!association) {
      return res.status(404).json({
        success: false,
        message: 'Association not found'
      });
    }

    res.json({
      success: true,
      association
    });
  } catch (error) {
    console.error('Error fetching association:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// @desc    Get members for a specific association
// @route   GET /api/associations/:id/members
// @access  Private
router.get('/:id/members', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().trim(),
  query('businessType').optional().isIn(['catering', 'sound', 'mandap', 'madap', 'light', 'decorator', 'photography', 'videography', 'transport', 'other']),
  query('sortBy').optional().isIn(['name', 'businessName', 'city', 'businessType', 'created_at']),
  query('sortOrder').optional().isIn(['asc', 'desc'])
], protect, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    // First, get the association to ensure it exists
    const association = await Association.findByPk(req.params.id);
    if (!association) {
      return res.status(404).json({
        success: false,
        message: 'Association not found'
      });
    }

    const {
      page = 1,
      limit = 10,
      search,
      businessType,
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object - use both associationId and associationName for reliability
    const where = {
      [Op.or]: [
        { associationId: parseInt(req.params.id) },
        { associationName: association.name }
      ]
    };

    // Apply search filters
    if (search) {
      where[Op.and] = [
        where,
        {
          [Op.or]: [
            { name: { [Op.iLike]: `%${search}%` } },
            { businessName: { [Op.iLike]: `%${search}%` } },
            { city: { [Op.iLike]: `%${search}%` } },
            { phone: { [Op.iLike]: `%${search}%` } }
          ]
        }
      ];
    }

    if (businessType) {
      where.businessType = businessType;
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
    const totalPages = Math.ceil(total / parseInt(limit));
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      success: true,
      association: {
        id: association.id,
        name: association.name,
        city: association.city,
        state: association.state
      },
      count: members.length,
      total,
      page: parseInt(page),
      totalPages,
      hasNextPage,
      hasPrevPage,
      members
    });

  } catch (error) {
    console.error('Get association members error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching association members'
    });
  }
});

// @desc    Update association
// @route   PUT /api/associations/:id
// @access  Private (Admin, Sub-Admin)
router.put('/:id', protect, authorize(['admin', 'sub-admin']), validateAssociation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const association = await Association.findByPk(req.params.id);
    
    if (!association) {
      return res.status(404).json({
        success: false,
        message: 'Association not found'
      });
    }

    const updateData = {
      name: req.body.name,
      address: req.body.address || '',
      city: req.body.city,
      district: req.body.district || undefined,
      state: req.body.state,
      pincode: req.body.pincode,
      establishedYear: req.body.establishedYear,
      contactPerson: req.body.contactPerson || undefined,
      phone: req.body.phone || undefined,
      email: req.body.email || undefined,
      website: req.body.website || undefined,
      socialLinks: {
        linkedin: req.body.socialLinks?.linkedin || undefined,
        twitter: req.body.socialLinks?.twitter || undefined,
        facebook: req.body.socialLinks?.facebook || undefined
      },
      logo: req.body.logo || undefined
    };

    await association.update(updateData);
    const updatedAssociation = await Association.findByPk(req.params.id);

    res.json({
      success: true,
      message: 'Association updated successfully',
      association: updatedAssociation
    });
  } catch (error) {
    console.error('Error updating association:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// @desc    Delete association
// @route   DELETE /api/associations/:id
// @access  Private (Admin, Sub-Admin)
router.delete('/:id', protect, authorize(['admin', 'sub-admin']), async (req, res) => {
  try {
    const association = await Association.findByPk(req.params.id);
    
    if (!association) {
      return res.status(404).json({
        success: false,
        message: 'Association not found'
      });
    }

    await association.destroy();

    res.json({
      success: true,
      message: 'Association deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting association:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// @desc    Toggle association status
// @route   PATCH /api/associations/:id/toggle-status
// @access  Private (Admin, Sub-Admin)
router.patch('/:id/toggle-status', protect, authorize(['admin', 'sub-admin']), async (req, res) => {
  try {
    const association = await Association.findByPk(req.params.id);
    
    if (!association) {
      return res.status(404).json({
        success: false,
        message: 'Association not found'
      });
    }

    const newStatus = association.status === 'Active' ? 'Inactive' : 'Active';
    await association.update({ status: newStatus });

    res.json({
      success: true,
      message: `Association status updated to ${newStatus}`,
      association
    });
  } catch (error) {
    console.error('Error toggling association status:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// @desc    Get association statistics
// @route   GET /api/associations/stats/overview
// @access  Private
router.get('/stats/overview', protect, async (req, res) => {
  try {
    const totalAssociations = await Association.count();
    const activeAssociations = await Association.count({ where: { status: 'Active' } });
    const pendingAssociations = await Association.count({ where: { status: 'Pending' } });
    const inactiveAssociations = await Association.count({ where: { status: 'Inactive' } });

    // Get associations by state
    const associationsByState = await Association.findAll({
      attributes: [
        ['address.state', 'state'],
        [Association.sequelize.fn('COUNT', Association.sequelize.col('id')), 'count']
      ],
      group: [Association.sequelize.col('address.state')],
      order: [[Association.sequelize.fn('COUNT', Association.sequelize.col('id')), 'DESC']],
      raw: true
    });

    // Get associations by city
    const associationsByCity = await Association.findAll({
      attributes: [
        ['address.city', 'city'],
        [Association.sequelize.fn('COUNT', Association.sequelize.col('id')), 'count']
      ],
      group: [Association.sequelize.col('address.city')],
      order: [[Association.sequelize.fn('COUNT', Association.sequelize.col('id')), 'DESC']],
      raw: true
    });

    res.json({
      success: true,
      stats: {
        total: totalAssociations,
        active: activeAssociations,
        pending: pendingAssociations,
        inactive: inactiveAssociations,
        byState: associationsByState,
        byCity: associationsByCity
      }
    });
  } catch (error) {
    console.error('Error fetching association statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
