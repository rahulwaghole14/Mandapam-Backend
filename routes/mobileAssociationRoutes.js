const express = require('express');
const { Association, BOD } = require('../models');
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
    
    if (req.query.city) {
      whereClause.city = { [Op.iLike]: `%${req.query.city}%` };
    }

    // Build search query
    if (req.query.search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${req.query.search}%` } },
        { phone: { [Op.iLike]: `%${req.query.search}%` } }
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
    console.error('Get associations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching associations'
    });
  }
});

// @desc    Get all Board of Directors members
// @route   GET /api/mobile/bod
// @access  Private
router.get('/bod', protectMobile, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
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

    res.status(200).json({
      success: true,
      count: bod.rows.length,
      total: bod.count,
      page,
      pages: Math.ceil(bod.count / limit),
      bod: bod.rows
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
      whereClause.city = { [Op.iLike]: `%${city}%` };
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

    // Build filter object for specific city
    const whereClause = { 
      isActive: true,
      city: { [Op.iLike]: `%${city}%` }
    };

    // Build search query if provided
    if (req.query.search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${req.query.search}%` } },
        { phone: { [Op.iLike]: `%${req.query.search}%` } }
      ];
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

    res.status(200).json({
      success: true,
      association
    });

  } catch (error) {
    console.error('Get association error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching association'
    });
  }
});

module.exports = router;
