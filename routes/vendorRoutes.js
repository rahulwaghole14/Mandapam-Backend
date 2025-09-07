const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const Vendor = require('../models/Vendor');
const User = require('../models/User');
const { protect, authorize, authorizeDistrict } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply protection to all routes
router.use(protect);

// @desc    Get all vendors with filtering and pagination
// @route   GET /api/vendors
// @access  Private
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().trim(),
  query('category').optional().isString().trim(),
  query('status').optional().isIn(['Active', 'Inactive', 'Pending', 'Suspended']),
  query('city').optional().isString().trim(),
  query('district').optional().isString().trim(),
  query('sortBy').optional().isIn(['name', 'businessName', 'dateOfJoining', 'membershipExpiry', 'rating']),
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
      category,
      status,
      city,
      district,
      sortBy = 'dateOfJoining',
      sortOrder = 'desc'
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
        { name: { [Op.iLike]: `%${search}%` } },
        { businessName: { [Op.iLike]: `%${search}%` } },
        { city: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (category) {
      where.businessType = category;
    }

    if (status) {
      where.status = status;
    }

    if (city) {
      where.city = city;
    }

    if (district) {
      where.district = district;
    }

    // Build sort object
    const order = [];
    if (sortBy === 'dateOfJoining') {
      order.push(['createdAt', sortOrder.toUpperCase()]);
    } else {
      order.push([sortBy, sortOrder.toUpperCase()]);
    }

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Execute query
    const { count, rows: vendors } = await Vendor.findAndCountAll({
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
      count: vendors.length,
      total,
      page: parseInt(page),
      totalPages,
      hasNextPage,
      hasPrevPage,
      vendors
    });

  } catch (error) {
    console.error('Get vendors error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching vendors'
    });
  }
});

// @desc    Get single vendor
// @route   GET /api/vendors/:id
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id, {
      include: [
        { model: User, as: 'createdByUser', attributes: ['name', 'email'] },
        { model: User, as: 'updatedByUser', attributes: ['name', 'email'] },
        { model: User, as: 'verifiedByUser', attributes: ['name', 'email'] }
      ]
    });

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Check district access for sub-admins
    if (req.user.role === 'sub-admin' && vendor.district !== req.user.district) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to vendor in different district'
      });
    }

    res.status(200).json({
      success: true,
      vendor
    });

  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching vendor'
    });
  }
});

// @desc    Create new vendor
// @route   POST /api/vendors
// @access  Private
router.post('/', [
  body('name', 'Vendor name is required').notEmpty().trim(),
  body('businessName', 'Business name is required').notEmpty().trim(),
  body('category', 'Category is required').isIn([
    'Catering', 'Decoration', 'Photography', 'Videography', 'Music', 
    'Transport', 'Venue', 'Makeup', 'Jewelry', 'Clothing', 'Other'
  ]),
  body('status', 'Status is required').isIn(['Active', 'Inactive', 'Pending', 'Suspended']),
  body('phone', 'Phone number is required').matches(/^[0-9]{10}$/),
  body('email', 'Please include a valid email').isEmail(),
  body('address.street', 'Street address is required').notEmpty().trim(),
  body('address.city', 'City is required').notEmpty().trim(),
  body('address.district', 'District is required').notEmpty().trim(),
  body('address.state', 'State is required').notEmpty().trim(),
  body('address.pincode', 'Pincode is required').matches(/^[0-9]{6}$/),
  body('membershipExpiry', 'Membership expiry date is required').isISO8601(),
  body('services').optional().isArray(),
  body('pricing.startingPrice').optional().isNumeric().withMessage('Starting price must be a number')
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

    // Add createdBy and updatedBy
    req.body.createdBy = req.user.id;
    req.body.updatedBy = req.user.id;

    // Create vendor
    const vendor = await Vendor.create(req.body);

    // Get vendor with populated fields
    const vendorWithDetails = await Vendor.findByPk(vendor.id, {
      include: [
        { model: User, as: 'createdBy', attributes: ['name', 'email'] }
      ]
    });

    res.status(201).json({
      success: true,
      vendor: vendorWithDetails
    });

  } catch (error) {
    console.error('Create vendor error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Vendor with this email or business name already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating vendor'
    });
  }
});

// @desc    Update vendor
// @route   PUT /api/vendors/:id
// @access  Private
router.put('/:id', [
  body('name').optional().notEmpty().trim().withMessage('Name cannot be empty'),
  body('businessName').optional().notEmpty().trim().withMessage('Business name cannot be empty'),
  body('category').optional().isIn([
    'Catering', 'Decoration', 'Photography', 'Videography', 'Music', 
    'Transport', 'Venue', 'Makeup', 'Jewelry', 'Clothing', 'Other'
  ]),
  body('status').optional().isIn(['Active', 'Inactive', 'Pending', 'Suspended']).withMessage('Invalid status'),
  body('phone').optional().matches(/^[0-9]{10}$/).withMessage('Invalid phone number'),
  body('email').optional().isEmail().withMessage('Invalid email'),
  body('address.street').optional().notEmpty().trim().withMessage('Street address cannot be empty'),
  body('address.city').optional().notEmpty().trim().withMessage('City cannot be empty'),
  body('address.district').optional().notEmpty().trim().withMessage('District cannot be empty'),
  body('address.state').optional().notEmpty().trim().withMessage('State cannot be empty'),
  body('address.pincode').optional().matches(/^[0-9]{6}$/).withMessage('Invalid pincode'),
  body('membershipExpiry').optional().isISO8601().withMessage('Invalid date format'),
  body('pricing.startingPrice').optional().isNumeric().withMessage('Starting price must be a number')
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

    // Find vendor first to check access
    const existingVendor = await Vendor.findByPk(req.params.id);
    if (!existingVendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Check district access for sub-admins
    if (req.user.role === 'sub-admin' && existingVendor.district !== req.user.district) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to vendor in different district'
      });
    }

    // Add updatedBy
    req.body.updatedBy = req.user.id;

    // Update vendor
    await existingVendor.update(req.body);

    // Get updated vendor with populated fields
    const vendor = await Vendor.findByPk(req.params.id, {
      include: [
        { model: User, as: 'createdBy', attributes: ['name', 'email'] },
        { model: User, as: 'updatedBy', attributes: ['name', 'email'] }
      ]
    });

    res.status(200).json({
      success: true,
      vendor
    });

  } catch (error) {
    console.error('Update vendor error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Vendor with this email or business name already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating vendor'
    });
  }
});

// @desc    Delete vendor
// @route   DELETE /api/vendors/:id
// @access  Private (Admin only for deletion)
router.delete('/:id', authorize('admin'), async (req, res) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    await vendor.destroy();

    res.status(200).json({
      success: true,
      message: 'Vendor deleted successfully'
    });

  } catch (error) {
    console.error('Delete vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting vendor'
    });
  }
});

// @desc    Get vendor statistics
// @route   GET /api/vendors/stats/overview
// @access  Private
router.get('/stats/overview', async (req, res) => {
  try {
    // Build filter for district-based access
    const where = {};
    if (req.user.role === 'sub-admin') {
      where.district = req.user.district;
    }

    // Get counts
    const totalVendors = await Vendor.count({ where });
    const activeVendors = await Vendor.count({ where: { ...where, status: 'Active' } });
    const pendingVendors = await Vendor.count({ where: { ...where, status: 'Pending' } });
    
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const expiringVendors = await Vendor.count({
      where: {
        ...where,
        membershipExpiry: {
          [Op.gte]: new Date(),
          [Op.lte]: thirtyDaysFromNow
        }
      }
    });

    // Get category distribution
    const categoryStats = await Vendor.findAll({
      where,
      attributes: [
        'businessType',
        [Vendor.sequelize.fn('COUNT', Vendor.sequelize.col('id')), 'count']
      ],
      group: ['businessType'],
      order: [[Vendor.sequelize.fn('COUNT', Vendor.sequelize.col('id')), 'DESC']],
      raw: true
    });

    // Get district distribution
    const districtStats = await Vendor.findAll({
      where,
      attributes: [
        'district',
        [Vendor.sequelize.fn('COUNT', Vendor.sequelize.col('id')), 'count']
      ],
      group: ['district'],
      order: [[Vendor.sequelize.fn('COUNT', Vendor.sequelize.col('id')), 'DESC']],
      raw: true
    });

    res.status(200).json({
      success: true,
      stats: {
        total: totalVendors,
        active: activeVendors,
        pending: pendingVendors,
        expiring: expiringVendors,
        categories: categoryStats,
        districts: districtStats
      }
    });

  } catch (error) {
    console.error('Get vendor stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching vendor statistics'
    });
  }
});

// @desc    Verify vendor (Admin/Sub-admin)
// @route   PUT /api/vendors/:id/verify
// @access  Private
router.put('/:id/verify', async (req, res) => {
  try {
    const vendor = await Vendor.findByPk(req.params.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found'
      });
    }

    // Check district access for sub-admins
    if (req.user.role === 'sub-admin' && vendor.district !== req.user.district) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to vendor in different district'
      });
    }

    // Update verification status
    await vendor.update({
      isVerified: !vendor.isVerified,
      verifiedBy: req.user.id,
      verifiedAt: !vendor.isVerified ? new Date() : null
    });

    res.status(200).json({
      success: true,
      vendor,
      message: `Vendor ${vendor.isVerified ? 'verified' : 'unverified'} successfully`
    });

  } catch (error) {
    console.error('Verify vendor error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while verifying vendor'
    });
  }
});

module.exports = router;

