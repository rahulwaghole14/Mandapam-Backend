const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { protect, authorize } = require('../middleware/authMiddleware');
const Association = require('../models/Association');

// Validation middleware
const validateAssociation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Association name is required and cannot exceed 100 characters'),
  body('address.city')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('City is required and cannot exceed 50 characters'),
  body('address.district')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('District is required and cannot exceed 50 characters'),
  body('address.state')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('State is required and cannot exceed 50 characters'),
  body('address.pincode')
    .matches(/^[0-9]{6}$/)
    .withMessage('Please enter a valid 6-digit pincode'),
  body('establishedDate')
    .isISO8601()
    .withMessage('Please enter a valid established date'),
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const associationData = {
      name: req.body.name,
      address: req.body.address,
      establishedDate: req.body.establishedDate,
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
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (city) filter['address.city'] = city;
    if (state) filter['address.state'] = state;
    if (status) filter.status = status;

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const associations = await Association.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await Association.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      associations,
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
    const association = await Association.findById(req.params.id).select('-__v');
    
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

    const association = await Association.findById(req.params.id);
    
    if (!association) {
      return res.status(404).json({
        success: false,
        message: 'Association not found'
      });
    }

    const updateData = {
      name: req.body.name,
      address: req.body.address,
      establishedDate: req.body.establishedDate,
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

    const updatedAssociation = await Association.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-__v');

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
    const association = await Association.findById(req.params.id);
    
    if (!association) {
      return res.status(404).json({
        success: false,
        message: 'Association not found'
      });
    }

    await Association.findByIdAndDelete(req.params.id);

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
    const association = await Association.findById(req.params.id);
    
    if (!association) {
      return res.status(404).json({
        success: false,
        message: 'Association not found'
      });
    }

    const newStatus = association.status === 'Active' ? 'Inactive' : 'Active';
    association.status = newStatus;
    await association.save();

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
    const totalAssociations = await Association.countDocuments();
    const activeAssociations = await Association.countDocuments({ status: 'Active' });
    const pendingAssociations = await Association.countDocuments({ status: 'Pending' });
    const inactiveAssociations = await Association.countDocuments({ status: 'Inactive' });

    // Get associations by state
    const associationsByState = await Association.aggregate([
      {
        $group: {
          _id: '$address.state',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get associations by city
    const associationsByCity = await Association.aggregate([
      {
        $group: {
          _id: '$address.city',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

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
