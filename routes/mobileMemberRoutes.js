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

    const member = await Member.findByPk(req.user.id);
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Update member fields
    await member.update({
      ...req.body
    });

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
    const limit = parseInt(req.query.limit) || 50;
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

    // Add paymentStatus filter if provided
    if (req.query.paymentStatus) {
      whereClause.paymentStatus = req.query.paymentStatus;
    }

    const members = await Member.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['createdBy', 'updatedBy'] },
      order: [['name', 'ASC']], // Sort by name as required by mobile app
      offset,
      limit,
      include: [{
        model: Association,
        as: 'association',
        attributes: ['name'],
        required: false
      }]
    });

    // Transform data to match mobile app expectations
    const transformedMembers = members.rows.map(member => ({
      _id: member.id.toString(),
      name: member.name,
      businessName: member.businessName,
      businessType: member.businessType,
      phone: member.phone,
      city: member.city,
      state: member.state,
      pincode: member.pincode,
      associationName: member.associationName || member.association?.name || 'Unknown Association',
      profileImage: member.profileImage || 'https://via.placeholder.com/100x100/cccccc/666666?text=No+Photo',
      isActive: member.isActive,
      isMobileVerified: member.isVerified || false,
      paymentStatus: member.paymentStatus || 'Paid', // Default to 'Paid' if not set
      createdAt: member.created_at,
      updatedAt: member.updated_at
    }));

    res.status(200).json({
      success: true,
      members: transformedMembers, // ✅ Use 'members' field name as required by mobile app
      total: members.count,
      page,
      limit,
      hasNextPage: (page * limit) < members.count
    });

  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching members'
    });
  }
});

// @desc    Search members (FIXED ROUTE ORDER)
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
    const offset = (page - 1) * limit;

    // Build search query
    const whereClause = { isActive: true };
    
    if (q) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${q}%` } },
        { businessName: { [Op.iLike]: `%${q}%` } },
        { phone: { [Op.iLike]: `%${q}%` } }
      ];
    }
    
    if (businessType) {
      whereClause.businessType = businessType;
    }
    
    if (city) {
      whereClause[Op.or] = [
        { district: { [Op.iLike]: `%${city}%` } },
        { city: { [Op.iLike]: `%${city}%` } }
      ];
    }
    
    if (associationName) {
      whereClause['$association.name$'] = { [Op.iLike]: `%${associationName}%` };
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
        required: associationName ? true : false
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
    console.error('Search members error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching members'
    });
  }
});

// @desc    Filter members by criteria (FIXED ROUTE ORDER)
// @route   GET /api/mobile/members/filter
// @access  Private
router.get('/members/filter', protectMobile, async (req, res) => {
  try {
    const { businessType, city, state, associationName, paymentStatus } = req.query;
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Build filter query
    const whereClause = { isActive: true };
    
    if (businessType) {
      whereClause.businessType = businessType;
    }
    
    if (city) {
      whereClause[Op.or] = [
        { district: { [Op.iLike]: `%${city}%` } },
        { city: { [Op.iLike]: `%${city}%` } }
      ];
    }
    
    if (state) {
      whereClause.state = { [Op.iLike]: `%${state}%` };
    }
    
    if (associationName) {
      whereClause['$association.name$'] = { [Op.iLike]: `%${associationName}%` };
    }
    
    if (paymentStatus) {
      whereClause.paymentStatus = paymentStatus;
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
        required: associationName ? true : false
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
    console.error('Filter members error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while filtering members'
    });
  }
});

// @desc    Get specific member details (MOVED TO END)
// @route   GET /api/mobile/members/:id
// @access  Private
router.get('/members/:id', protectMobile, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate integer ID format
    if (!id.match(/^\d+$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid member ID format'
      });
    }

    const member = await Member.findByPk(id, {
      include: [{
        model: Association,
        as: 'association',
        attributes: ['id', 'name', 'description', 'city', 'state', 'phone', 'email']
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
    console.error('Get member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching member'
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
    const todayMonth = today.getMonth() + 1; // getMonth() returns 0-11, we need 1-12
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
      
      try {
        // Ensure birthDate is a proper Date object
        const birthDate = new Date(member.birthDate);
        if (isNaN(birthDate.getTime())) return false;
        
        const birthMonth = birthDate.getMonth() + 1;
        const birthDay = birthDate.getDate();
        
        // Calculate days until birthday this year
        const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
        const nextYearBirthday = new Date(today.getFullYear() + 1, birthDate.getMonth(), birthDate.getDate());
        
        let daysUntil;
        if (thisYearBirthday >= today) {
          daysUntil = Math.ceil((thisYearBirthday - today) / (1000 * 60 * 60 * 24));
        } else {
          daysUntil = Math.ceil((nextYearBirthday - today) / (1000 * 60 * 60 * 24));
        }
        
        // Include birthdays in the next 7 days (1-7 days from now)
        return daysUntil >= 1 && daysUntil <= 7;
      } catch (dateError) {
        console.error('Date processing error for member:', member.id, dateError);
        return false;
      }
    });

    // Calculate age and days until birthday for each member
    const membersWithDetails = upcomingBirthdays.map(member => {
      const memberObj = member.toJSON();
      if (member.birthDate) {
        try {
          const birthDate = new Date(member.birthDate);
          const birthYear = birthDate.getFullYear();
          const currentYear = today.getFullYear();
          memberObj.age = currentYear - birthYear;
          
          // Calculate days until birthday
          const thisYearBirthday = new Date(currentYear, birthDate.getMonth(), birthDate.getDate());
          const nextYearBirthday = new Date(currentYear + 1, birthDate.getMonth(), birthDate.getDate());
          
          const daysUntil = thisYearBirthday >= today 
            ? Math.ceil((thisYearBirthday - today) / (1000 * 60 * 60 * 24))
            : Math.ceil((nextYearBirthday - today) / (1000 * 60 * 60 * 24));
          
          memberObj.daysUntilBirthday = daysUntil;
        } catch (dateError) {
          console.error('Date calculation error for member:', member.id, dateError);
          memberObj.age = null;
          memberObj.daysUntilBirthday = null;
        }
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
