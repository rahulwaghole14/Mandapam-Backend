const express = require('express');
const { body, validationResult } = require('express-validator');
const Member = require('../models/Member');
const { protectMobile } = require('../middleware/mobileAuthMiddleware');

const router = express.Router();

// @desc    Get current member profile
// @route   GET /api/mobile/profile
// @access  Private
router.get('/profile', protectMobile, async (req, res) => {
  try {
    const member = await Member.findById(req.user.id);
    
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
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
});

// @desc    Update member profile
// @route   PUT /api/mobile/profile
// @access  Private
router.put('/profile', protectMobile, [
  body('name', 'Name is required').notEmpty().trim(),
  body('businessName', 'Business name is required').notEmpty().trim(),
  body('businessType', 'Business type is required').isIn(['sound', 'decorator', 'catering', 'generator', 'madap', 'light']),
  body('city', 'City is required').notEmpty().trim(),
  body('pincode', 'Pincode is required').matches(/^[0-9]{6}$/),
  body('associationName', 'Association name is required').notEmpty().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const member = await Member.findByIdAndUpdate(
      req.user.id,
      {
        ...req.body,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      member
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
});

// @desc    Get all members with pagination and filtering
// @route   GET /api/mobile/members
// @access  Private
router.get('/members', protectMobile, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = { isActive: true };
    
    if (req.query.businessType) {
      filter.businessType = req.query.businessType;
    }
    
    if (req.query.city) {
      filter.city = new RegExp(req.query.city, 'i');
    }
    
    if (req.query.associationName) {
      filter.associationName = new RegExp(req.query.associationName, 'i');
    }

    // Build search query
    let searchQuery = {};
    if (req.query.search) {
      searchQuery = {
        $or: [
          { name: new RegExp(req.query.search, 'i') },
          { businessName: new RegExp(req.query.search, 'i') },
          { phone: new RegExp(req.query.search, 'i') }
        ]
      };
    }

    // Combine filters
    const finalFilter = { ...filter, ...searchQuery };

    const members = await Member.find(finalFilter)
      .select('-createdBy -updatedBy')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Member.countDocuments(finalFilter);

    res.status(200).json({
      success: true,
      count: members.length,
      total,
      page,
      pages: Math.ceil(total / limit),
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

// @desc    Get specific member details
// @route   GET /api/mobile/members/:id
// @access  Private
router.get('/members/:id', protectMobile, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid member ID format'
      });
    }

    const member = await Member.findById(id)
      .select('-createdBy -updatedBy');

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

// @desc    Search members
// @route   GET /api/mobile/members/search
// @access  Private
router.get('/members/search', protectMobile, async (req, res) => {
  try {
    const { q, businessType, city, associationName } = req.query;
    
    if (!q && !businessType && !city && !associationName) {
      return res.status(400).json({
        success: false,
        message: 'Please provide search criteria'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build search query
    const searchQuery = { isActive: true };
    
    if (q) {
      searchQuery.$or = [
        { name: new RegExp(q, 'i') },
        { businessName: new RegExp(q, 'i') },
        { phone: new RegExp(q, 'i') }
      ];
    }
    
    if (businessType) {
      searchQuery.businessType = businessType;
    }
    
    if (city) {
      searchQuery.city = new RegExp(city, 'i');
    }
    
    if (associationName) {
      searchQuery.associationName = new RegExp(associationName, 'i');
    }

    const members = await Member.find(searchQuery)
      .select('-createdBy -updatedBy')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Member.countDocuments(searchQuery);

    res.status(200).json({
      success: true,
      count: members.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      members
    });

  } catch (error) {
    console.error('Search members error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching members'
    });
  }
});

// @desc    Filter members by criteria
// @route   GET /api/mobile/members/filter
// @access  Private
router.get('/members/filter', protectMobile, async (req, res) => {
  try {
    const { businessType, city, state, associationName, paymentStatus } = req.query;
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter query
    const filterQuery = { isActive: true };
    
    if (businessType) {
      filterQuery.businessType = businessType;
    }
    
    if (city) {
      filterQuery.city = new RegExp(city, 'i');
    }
    
    if (state) {
      filterQuery.state = new RegExp(state, 'i');
    }
    
    if (associationName) {
      filterQuery.associationName = new RegExp(associationName, 'i');
    }
    
    if (paymentStatus) {
      filterQuery.paymentStatus = paymentStatus;
    }

    const members = await Member.find(filterQuery)
      .select('-createdBy -updatedBy')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Member.countDocuments(filterQuery);

    res.status(200).json({
      success: true,
      count: members.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      members
    });

  } catch (error) {
    console.error('Filter members error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while filtering members'
    });
  }
});

module.exports = router;
