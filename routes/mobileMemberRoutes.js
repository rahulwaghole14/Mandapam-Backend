const express = require('express');
const { body, validationResult } = require('express-validator');
const { Member, Association, sequelize } = require('../models');
const { protectMobile } = require('../middleware/mobileAuthMiddleware');
const { Op } = require('sequelize');

const router = express.Router();

// @desc    Get current member profile
// @route   GET /api/mobile/profile
// @access  Private
router.get('/profile', protectMobile, async (req, res) => {
  try {
    const member = await Member.findByPk(req.user.id, {
      include: [{
        model: Association,
        as: 'association',
        attributes: ['name']
      }]
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
  body('associationName', 'Association name is required').notEmpty().trim(),
  body('birthDate').optional().isISO8601().withMessage('Birth date must be a valid date'),
  body('email').optional().isEmail().withMessage('Please provide a valid email')
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
    const offset = (page - 1) * limit;

    // Build filter object
    const whereClause = { isActive: true };
    
    if (req.query.businessType) {
      whereClause.businessType = req.query.businessType;
    }
    
    if (req.query.city) {
      whereClause.city = {
        [Op.iLike]: `%${req.query.city}%`
      };
    }

    // Build search query
    if (req.query.search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${req.query.search}%` } },
        { businessName: { [Op.iLike]: `%${req.query.search}%` } },
        { phone: { [Op.iLike]: `%${req.query.search}%` } }
      ];
    }

    const members = await Member.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['createdBy', 'updatedBy'] },
      order: [['created_at', 'DESC']],
      offset,
      limit,
      include: [{
        model: Association,
        as: 'association',
        attributes: ['name'],
        required: false
      }]
    });

    res.status(200).json({
      success: true,
      count: members.rows.length,
      total: members.count,
      page,
      pages: Math.ceil(members.count / limit),
      members: members.rows
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

// @desc    Get today's member birthdays
// @route   GET /api/mobile/birthdays/today
// @access  Private
router.get('/birthdays/today', protectMobile, async (req, res) => {
  try {
    const today = new Date();
    const todayMonth = today.getMonth() + 1; // getMonth() returns 0-11, we need 1-12
    const todayDay = today.getDate();

    // Find members whose birthday is today
    const birthdayMembers = await Member.findAll({
      where: {
        isActive: true,
        birth_date: {
          [Op.ne]: null
        },
        [Op.and]: [
          sequelize.where(sequelize.fn('EXTRACT', sequelize.literal("'MONTH' FROM birth_date")), todayMonth),
          sequelize.where(sequelize.fn('EXTRACT', sequelize.literal("'DAY' FROM birth_date")), todayDay)
        ]
      },
      attributes: ['id', 'name', 'businessName', 'businessType', 'city', 'state', 'profileImage', 'birthDate', 'phone', 'email'],
      include: [{
        model: Association,
        as: 'association',
        attributes: ['name']
      }],
      order: [['name', 'ASC']]
    });

    // Calculate age for each member
    const membersWithAge = birthdayMembers.map(member => {
      const memberObj = member.toJSON();
      if (member.birthDate) {
        const birthYear = new Date(member.birthDate).getFullYear();
        const currentYear = today.getFullYear();
        memberObj.age = currentYear - birthYear;
      }
      memberObj.associationName = member.association?.name || 'Unknown Association';
      return memberObj;
    });

    res.status(200).json({
      success: true,
      count: membersWithAge.length,
      date: today.toISOString().split('T')[0], // YYYY-MM-DD format
      message: membersWithAge.length > 0 
        ? `Found ${membersWithAge.length} member(s) celebrating birthday today`
        : 'No birthdays today',
      members: membersWithAge
    });

  } catch (error) {
    console.error('Get today birthdays error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching today\'s birthdays'
    });
  }
});

// @desc    Get upcoming member birthdays (next 7 days)
// @route   GET /api/mobile/birthdays/upcoming
// @access  Private
router.get('/birthdays/upcoming', protectMobile, async (req, res) => {
  try {
    const today = new Date();
    const todayMonth = today.getMonth() + 1; // MongoDB months are 1-12
    const todayDay = today.getDate();

    // Get all members with birth dates
    const allMembersWithBirthdays = await Member.findAll({
      where: {
        isActive: true,
        birth_date: {
          [Op.ne]: null
        }
      },
      attributes: ['id', 'name', 'businessName', 'businessType', 'city', 'state', 'profileImage', 'birthDate', 'phone', 'email'],
      include: [{
        model: Association,
        as: 'association',
        attributes: ['name']
      }],
      order: [['name', 'ASC']]
    });

    // Filter members whose birthday is in the next 7 days
    const upcomingBirthdays = allMembersWithBirthdays.filter(member => {
      if (!member.birthDate) return false;
      
      const birthMonth = member.birthDate.getMonth() + 1;
      const birthDay = member.birthDate.getDate();
      
      // Calculate days until birthday this year
      const thisYearBirthday = new Date(today.getFullYear(), member.birthDate.getMonth(), member.birthDate.getDate());
      const nextYearBirthday = new Date(today.getFullYear() + 1, member.birthDate.getMonth(), member.birthDate.getDate());
      
      let daysUntil;
      if (thisYearBirthday >= today) {
        daysUntil = Math.ceil((thisYearBirthday - today) / (1000 * 60 * 60 * 24));
      } else {
        daysUntil = Math.ceil((nextYearBirthday - today) / (1000 * 60 * 60 * 24));
      }
      
      // Include birthdays in the next 7 days (1-7 days from now)
      return daysUntil >= 1 && daysUntil <= 7;
    });

    // Calculate age and days until birthday for each member
    const membersWithDetails = upcomingBirthdays.map(member => {
      const memberObj = member.toJSON();
      if (member.birthDate) {
        const birthYear = new Date(member.birthDate).getFullYear();
        const currentYear = today.getFullYear();
        memberObj.age = currentYear - birthYear;
        
        // Calculate days until birthday
        const thisYearBirthday = new Date(currentYear, new Date(member.birthDate).getMonth(), new Date(member.birthDate).getDate());
        const nextYearBirthday = new Date(currentYear + 1, new Date(member.birthDate).getMonth(), new Date(member.birthDate).getDate());
        
        const daysUntil = thisYearBirthday >= today 
          ? Math.ceil((thisYearBirthday - today) / (1000 * 60 * 60 * 24))
          : Math.ceil((nextYearBirthday - today) / (1000 * 60 * 60 * 24));
        
        memberObj.daysUntilBirthday = daysUntil;
      }
      memberObj.associationName = member.association?.name || 'Unknown Association';
      return memberObj;
    });

    res.status(200).json({
      success: true,
      count: membersWithDetails.length,
      period: 'next 7 days',
      message: membersWithDetails.length > 0 
        ? `Found ${membersWithDetails.length} member(s) with upcoming birthdays`
        : 'No upcoming birthdays in the next 7 days',
      members: membersWithDetails
    });

  } catch (error) {
    console.error('Get upcoming birthdays error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching upcoming birthdays'
    });
  }
});

module.exports = router;
