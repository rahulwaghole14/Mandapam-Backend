const express = require('express');
const Association = require('../models/Association');
const BOD = require('../models/BOD');
const { protectMobile } = require('../middleware/mobileAuthMiddleware');

const router = express.Router();

// @desc    Get all associations
// @route   GET /api/mobile/associations
// @access  Private
router.get('/associations', protectMobile, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = { status: 'Active' };
    
    if (req.query.state) {
      filter['address.state'] = new RegExp(req.query.state, 'i');
    }
    
    if (req.query.district) {
      filter['address.district'] = new RegExp(req.query.district, 'i');
    }
    
    if (req.query.city) {
      filter['address.city'] = new RegExp(req.query.city, 'i');
    }

    // Build search query
    let searchQuery = {};
    if (req.query.search) {
      searchQuery = {
        $or: [
          { name: new RegExp(req.query.search, 'i') },
          { contactPerson: new RegExp(req.query.search, 'i') }
        ]
      };
    }

    // Combine filters
    const finalFilter = { ...filter, ...searchQuery };

    const associations = await Association.find(finalFilter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Association.countDocuments(finalFilter);

    res.status(200).json({
      success: true,
      count: associations.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      associations
    });

  } catch (error) {
    console.error('Get associations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching associations'
    });
  }
});

// @desc    Get specific association details
// @route   GET /api/mobile/associations/:id
// @access  Private
router.get('/associations/:id', protectMobile, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid association ID format'
      });
    }

    const association = await Association.findById(id);

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

// @desc    Get all Board of Directors members
// @route   GET /api/mobile/bod
// @access  Private
router.get('/bod', protectMobile, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build filter object
    const filter = { isActive: true };
    
    if (req.query.designation) {
      filter.designation = req.query.designation;
    }

    // Build search query
    let searchQuery = {};
    if (req.query.search) {
      searchQuery = {
        $or: [
          { name: new RegExp(req.query.search, 'i') },
          { designation: new RegExp(req.query.search, 'i') },
          { email: new RegExp(req.query.search, 'i') }
        ]
      };
    }

    // Combine filters
    const finalFilter = { ...filter, ...searchQuery };

    const bod = await BOD.find(finalFilter)
      .select('-createdBy -updatedBy')
      .sort({ 
        designation: 1, // Sort by designation priority
        name: 1 
      })
      .skip(skip)
      .limit(limit);

    const total = await BOD.countDocuments(finalFilter);

    res.status(200).json({
      success: true,
      count: bod.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      bod
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
    
    // Validate MongoDB ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid BOD member ID format'
      });
    }

    const bodMember = await BOD.findById(id)
      .select('-createdBy -updatedBy');

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
    
    const bodMembers = await BOD.find({ 
      designation: designation,
      isActive: true 
    })
    .select('-createdBy -updatedBy')
    .sort({ name: 1 });

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

// @desc    Search associations
// @route   GET /api/mobile/associations/search
// @access  Private
router.get('/associations/search', protectMobile, async (req, res) => {
  try {
    const { q, state, district, city } = req.query;
    
    if (!q && !state && !district && !city) {
      return res.status(400).json({
        success: false,
        message: 'Please provide search criteria'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Build search query
    const searchQuery = { status: 'Active' };
    
    if (q) {
      searchQuery.$or = [
        { name: new RegExp(q, 'i') },
        { contactPerson: new RegExp(q, 'i') }
      ];
    }
    
    if (state) {
      searchQuery['address.state'] = new RegExp(state, 'i');
    }
    
    if (district) {
      searchQuery['address.district'] = new RegExp(district, 'i');
    }
    
    if (city) {
      searchQuery['address.city'] = new RegExp(city, 'i');
    }

    const associations = await Association.find(searchQuery)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Association.countDocuments(searchQuery);

    res.status(200).json({
      success: true,
      count: associations.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      associations
    });

  } catch (error) {
    console.error('Search associations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching associations'
    });
  }
});

// @desc    Get association statistics
// @route   GET /api/mobile/associations/stats
// @access  Private
router.get('/associations/stats', protectMobile, async (req, res) => {
  try {
    const stats = await Association.aggregate([
      {
        $group: {
          _id: null,
          totalAssociations: { $sum: 1 },
          activeAssociations: {
            $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] }
          },
          pendingAssociations: {
            $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] }
          },
          inactiveAssociations: {
            $sum: { $cond: [{ $eq: ['$status', 'Inactive'] }, 1, 0] }
          }
        }
      }
    ]);

    const associationsByState = await Association.aggregate([
      { $match: { status: 'Active' } },
      {
        $group: {
          _id: '$address.state',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const associationsByDistrict = await Association.aggregate([
      { $match: { status: 'Active' } },
      {
        $group: {
          _id: '$address.district',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    res.status(200).json({
      success: true,
      stats: stats[0] || {
        totalAssociations: 0,
        activeAssociations: 0,
        pendingAssociations: 0,
        inactiveAssociations: 0
      },
      associationsByState,
      associationsByDistrict
    });

  } catch (error) {
    console.error('Get association stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching association statistics'
    });
  }
});

module.exports = router;
