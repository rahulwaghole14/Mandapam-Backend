const express = require('express');
const { Association, BOD, Member } = require('../models');
const { Op } = require('sequelize');
const { protectMobile } = require('../middleware/mobileAuthMiddleware');

const router = express.Router();

// @desc    Get all associations (Public - for registration)
// @route   GET /api/mobile/associations
// @access  Public
router.get('/associations', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Build filter object
    const whereClause = { isActive: true };
    
    if (req.query.state) {
      whereClause.state = { [Op.iLike]: `%${req.query.state}%` };
    }
    
    // Build search conditions
    const searchConditions = [];
    const cityConditions = [];
    
    if (req.query.search) {
      searchConditions.push(
        { name: { [Op.iLike]: `%${req.query.search}%` } },
        { phone: { [Op.iLike]: `%${req.query.search}%` } }
      );
    }

    if (req.query.city) {
      cityConditions.push(
        { district: { [Op.iLike]: `%${req.query.city}%` } },
        { city: { [Op.iLike]: `%${req.query.city}%` } }
      );
    }
    
    // Combine conditions
    if (searchConditions.length > 0 && cityConditions.length > 0) {
      whereClause[Op.and] = [
        { [Op.or]: searchConditions },
        { [Op.or]: cityConditions }
      ];
    } else if (searchConditions.length > 0) {
      whereClause[Op.or] = searchConditions;
    } else if (cityConditions.length > 0) {
      whereClause[Op.or] = cityConditions;
    }

    const associations = await Association.findAndCountAll({
      where: whereClause,
      order: [['name', 'ASC']],
      offset,
      limit
    });

    // Calculate actual member count for each association
    const associationsWithMemberCount = await Promise.all(
      associations.rows.map(async (association) => {
        const actualMemberCount = await Member.count({
          where: { associationName: association.name }
        });
        
        return {
          ...association.toJSON(),
          totalMembers: actualMemberCount
        };
      })
    );

    res.status(200).json({
      success: true,
      count: associations.rows.length,
      total: associations.count,
      page,
      pages: Math.ceil(associations.count / limit),
      associations: associationsWithMemberCount
    });

  } catch (error) {
    console.error('Get associations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching associations'
    });
  }
});

// @desc    Get all Board of Directors members (Mobile App Format)
// @route   GET /api/mobile/bod
// @access  Private
router.get('/bod', protectMobile, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    // Build filter object
    const whereClause = { isActive: true };
    
    if (req.query.designation) {
      whereClause.position = req.query.designation;
    }

    // Build search query
    if (req.query.search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${req.query.search}%` } },
        { position: { [Op.iLike]: `%${req.query.search}%` } },
        { email: { [Op.iLike]: `%${req.query.search}%` } }
      ];
    }

    const bod = await BOD.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['createdBy', 'updatedBy'] },
      order: [['position', 'ASC'], ['name', 'ASC']],
      offset,
      limit,
      include: [{
        model: Association,
        as: 'association',
        attributes: ['name']
      }]
    });

    // Transform data to match mobile app expectations
    const transformedBods = bod.rows.map(bodMember => ({
      _id: bodMember.id.toString(),
      name: bodMember.name,
      designation: bodMember.position || bodMember.designation,
      profileImage: bodMember.profileImage || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjVGNUY1Ii8+CjxjaXJjbGUgY3g9IjUwIiBjeT0iMzUiIHI9IjE1IiBmaWxsPSIjREREREREIi8+CjxwYXRoIGQ9Ik0yMCA4MEMyMCA3MC4zNTg5IDI3LjM1ODkgNjMgMzcgNjNINjNDNzIuNjQxMSA2MyA4MCA3MC4zNTg5IDgwIDgwVjEwMEgyMFY4MFoiIGZpbGw9IiNEREREREQiLz4KPC9zdmc+',
      contactNumber: bodMember.contactNumber || bodMember.phone,
      email: bodMember.email,
      isActive: bodMember.isActive,
      associationName: bodMember.association?.name || 'National Board'
    }));

    res.status(200).json({
      success: true,
      bods: transformedBods, // ✅ Use 'bods' field name as required by mobile app
      total: bod.count,
      page,
      limit,
      hasNextPage: (page * limit) < bod.count
    });

  } catch (error) {
    console.error('Get BOD error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching board of directors'
    });
  }
});

// @desc    Get specific BOD member details
// @route   GET /api/mobile/bod/:id
// @access  Private
router.get('/bod/:id', protectMobile, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate integer ID format
    if (!id.match(/^\d+$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid BOD member ID format'
      });
    }

    const bodMember = await BOD.findByPk(id, {
      attributes: { exclude: ['createdBy', 'updatedBy'] },
      include: [{
        model: Association,
        as: 'association',
        attributes: ['name']
      }]
    });

    if (!bodMember) {
      return res.status(404).json({
        success: false,
        message: 'BOD member not found'
      });
    }

    res.status(200).json({
      success: true,
      bodMember
    });

  } catch (error) {
    console.error('Get BOD member error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching BOD member'
    });
  }
});

// @desc    Get BOD members by designation
// @route   GET /api/mobile/bod/designation/:designation
// @access  Private
router.get('/bod/designation/:designation', protectMobile, async (req, res) => {
  try {
    const { designation } = req.params;
    
    const bodMembers = await BOD.findAll({
      where: { 
        position: designation,
        isActive: true 
      },
      attributes: { exclude: ['createdBy', 'updatedBy'] },
      order: [['name', 'ASC']],
      include: [{
        model: Association,
        as: 'association',
        attributes: ['name']
      }]
    });

    res.status(200).json({
      success: true,
      count: bodMembers.length,
      designation,
      bodMembers
    });

  } catch (error) {
    console.error('Get BOD by designation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching BOD members by designation'
    });
  }
});

// @desc    Search associations (Public - for registration)
// @route   GET /api/mobile/associations/search
// @access  Public
router.get('/associations/search', async (req, res) => {
  try {
    const { q, state, city } = req.query;
    
    if (!q && !state && !city) {
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
        { phone: { [Op.iLike]: `%${q}%` } }
      ];
    }
    
    if (state) {
      whereClause.state = { [Op.iLike]: `%${state}%` };
    }
    
    if (city) {
      whereClause[Op.or] = [
        { district: { [Op.iLike]: `%${city}%` } },
        { city: { [Op.iLike]: `%${city}%` } }
      ];
    }

    const associations = await Association.findAndCountAll({
      where: whereClause,
      order: [['name', 'ASC']],
      offset,
      limit
    });

    res.status(200).json({
      success: true,
      count: associations.rows.length,
      total: associations.count,
      page,
      pages: Math.ceil(associations.count / limit),
      associations: associations.rows
    });

  } catch (error) {
    console.error('Search associations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching associations'
    });
  }
});

// @desc    Get associations by city (Public - for registration)
// @route   GET /api/mobile/associations/city/:city
// @access  Public
router.get('/associations/city/:city', async (req, res) => {
  try {
    const { city } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Build filter object for specific city (searches both district and city fields)
    const whereClause = { 
      isActive: true,
      [Op.and]: [
        {
          [Op.or]: [
            { district: { [Op.iLike]: `%${city}%` } },
            { city: { [Op.iLike]: `%${city}%` } }
          ]
        }
      ]
    };

    // Build search query if provided
    if (req.query.search) {
      whereClause[Op.and].push({
        [Op.or]: [
          { name: { [Op.iLike]: `%${req.query.search}%` } },
          { phone: { [Op.iLike]: `%${req.query.search}%` } }
        ]
      });
    }

    // Additional state filter if provided
    if (req.query.state) {
      whereClause.state = { [Op.iLike]: `%${req.query.state}%` };
    }

    const associations = await Association.findAndCountAll({
      where: whereClause,
      order: [['name', 'ASC']],
      offset,
      limit
    });

    res.status(200).json({
      success: true,
      count: associations.rows.length,
      total: associations.count,
      page,
      pages: Math.ceil(associations.count / limit),
      city,
      associations: associations.rows
    });

  } catch (error) {
    console.error('Get associations by city error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching associations by city'
    });
  }
});

// @desc    Get association statistics
// @route   GET /api/mobile/associations/stats
// @access  Private
router.get('/associations/stats', protectMobile, async (req, res) => {
  try {
    const totalAssociations = await Association.count();
    const activeAssociations = await Association.count({ where: { isActive: true } });

    res.status(200).json({
      success: true,
      stats: {
        totalAssociations,
        activeAssociations,
        pendingAssociations: 0,
        inactiveAssociations: totalAssociations - activeAssociations
      }
    });

  } catch (error) {
    console.error('Get association stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching association statistics'
    });
  }
});

// @desc    Get specific association details
// @route   GET /api/mobile/associations/:id
// @access  Private
router.get('/associations/:id', protectMobile, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate integer ID format
    if (!id.match(/^\d+$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid association ID format'
      });
    }

    const association = await Association.findByPk(id);

    if (!association) {
      return res.status(404).json({
        success: false,
        message: 'Association not found'
      });
    }

    // Calculate actual member count for this association
    const memberCount = await Member.count({
      where: { 
        isActive: true,
        [Op.or]: [
          { associationId: parseInt(id) },
          { associationName: association.name }
        ]
      }
    });

    // Add memberCount to association data
    const associationWithMemberCount = {
      ...association.toJSON(),
      memberCount
    };

    res.status(200).json({
      success: true,
      association: associationWithMemberCount
    });

  } catch (error) {
    console.error('Get association error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching association'
    });
  }
});

// @desc    Get BOD members for a specific association (Mobile)
// @route   GET /api/mobile/associations/:id/bod
// @access  Private
router.get('/associations/:id/bod', protectMobile, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate integer ID format
    if (!id.match(/^\d+$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid association ID format'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    // First, get the association to ensure it exists
    const association = await Association.findByPk(id);
    if (!association) {
      return res.status(404).json({
        success: false,
        message: 'Association not found'
      });
    }

    // Build filter object for BOD members of this association
    const whereClause = {
      isActive: true,
      associationId: parseInt(id)
    };

    // Add designation filter if provided
    if (req.query.designation) {
      whereClause.position = req.query.designation;
    }

    // Add search filter if provided
    if (req.query.search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${req.query.search}%` } },
        { position: { [Op.iLike]: `%${req.query.search}%` } },
        { email: { [Op.iLike]: `%${req.query.search}%` } }
      ];
    }

    const bodMembers = await BOD.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['createdBy', 'updatedBy'] },
      order: [['position', 'ASC'], ['name', 'ASC']],
      offset,
      limit,
      include: [{
        model: Association,
        as: 'association',
        attributes: ['name']
      }]
    });

    // Transform data to match mobile app expectations
    const transformedBods = bodMembers.rows.map(bodMember => ({
      _id: bodMember.id.toString(),
      name: bodMember.name,
      designation: bodMember.position || bodMember.designation,
      profileImage: bodMember.profileImage || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDEwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjRjVGNUY1Ii8+CjxjaXJjbGUgY3g9IjUwIiBjeT0iMzUiIHI9IjE1IiBmaWxsPSIjREREREREIi8+CjxwYXRoIGQ9Ik0yMCA4MEMyMCA3MC4zNTg5IDI3LjM1ODkgNjMgMzcgNjNINjNDNzIuNjQxMSA2MyA4MCA3MC4zNTg5IDgwIDgwVjEwMEgyMFY4MFoiIGZpbGw9IiNEREREREQiLz4KPC9zdmc+',
      contactNumber: bodMember.contactNumber || bodMember.phone,
      email: bodMember.email,
      isActive: bodMember.isActive,
      associationName: association.name
    }));

    res.status(200).json({
      success: true,
      association: {
        id: association.id,
        name: association.name,
        city: association.city,
        state: association.state
      },
      count: transformedBods.length,
      total: bodMembers.count,
      page,
      limit,
      hasNextPage: (page * limit) < bodMembers.count,
      bods: transformedBods
    });

  } catch (error) {
    console.error('Get association BOD error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching association BOD members'
    });
  }
});

// @desc    Get members for a specific association (Mobile)
// @route   GET /api/mobile/associations/:id/members
// @access  Private
router.get('/associations/:id/members', protectMobile, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate integer ID format
    if (!id.match(/^\d+$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid association ID format'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // First, get the association to ensure it exists
    const association = await Association.findByPk(id);
    if (!association) {
      return res.status(404).json({
        success: false,
        message: 'Association not found'
      });
    }

    // Build filter object - use both associationId and associationName for reliability
    const whereClause = {
      isActive: true,
      [Op.or]: [
        { associationId: parseInt(id) },
        { associationName: association.name }
      ]
    };

    // Add search filter if provided
    if (req.query.search) {
      whereClause[Op.and] = [
        whereClause,
        {
          [Op.or]: [
            { name: { [Op.iLike]: `%${req.query.search}%` } },
            { businessName: { [Op.iLike]: `%${req.query.search}%` } },
            { phone: { [Op.iLike]: `%${req.query.search}%` } }
          ]
        }
      ];
    }

    // Add business type filter if provided
    if (req.query.businessType) {
      whereClause.businessType = req.query.businessType;
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
      association: {
        id: association.id,
        name: association.name,
        city: association.city,
        state: association.state
      },
      count: members.rows.length,
      total: members.count,
      page,
      pages: Math.ceil(members.count / limit),
      members: members.rows
    });

  } catch (error) {
    console.error('Get association members error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching association members'
    });
  }
});

module.exports = router;
