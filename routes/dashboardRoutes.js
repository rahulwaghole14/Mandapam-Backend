const express = require('express');
const { query } = require('express-validator');
const Vendor = require('../models/Vendor');
const Member = require('../models/Member');
const Event = require('../models/Event');
const BOD = require('../models/BOD');
const Association = require('../models/Association');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply protection to all routes
router.use(protect);

// @desc    Get dashboard overview statistics
// @route   GET /api/dashboard/stats
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    // Build filter for district-based access
    const filter = {};
    if (req.user.role === 'sub-admin') {
      filter['address.district'] = req.user.district;
    }

    console.log('User role:', req.user.role);
    console.log('User district:', req.user.district);
    console.log('Filter being applied:', filter);

    // Get counts for all entities
    const [
      totalVendors,
      activeVendors,
      pendingVendors,
      totalMembers,
      activeMembers,
      totalEvents,
      upcomingEvents,
      totalBOD,
      activeBOD,
      totalAssociations,
      activeAssociations
    ] = await Promise.all([
      Vendor.countDocuments(filter),
      Vendor.countDocuments({ ...filter, status: 'Active' }),
      Vendor.countDocuments({ ...filter, status: 'Pending' }),
      Member.countDocuments(filter),
      Member.countDocuments({ ...filter, isActive: true }),
      Event.countDocuments(filter),
      Event.countDocuments({
        ...filter,
        startDate: { $gte: new Date() }
      }),
      BOD.countDocuments(filter),
      BOD.countDocuments({ ...filter, isActive: true }),
      Association.countDocuments(filter),
      Association.countDocuments({ ...filter, status: 'Active' })
    ]);

    // Calculate growth rate (comparing current month with previous month)
    const currentMonth = new Date();
    const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    
    const currentMonthVendors = await Vendor.countDocuments({
      ...filter,
      createdAt: { $gte: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1) }
    });
    
    const previousMonthVendors = await Vendor.countDocuments({
      ...filter,
      createdAt: { $gte: previousMonth, $lt: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1) }
    });

    const growthRate = previousMonthVendors > 0 
      ? Math.round(((currentMonthVendors - previousMonthVendors) / previousMonthVendors) * 100)
      : currentMonthVendors > 0 ? 100 : 0;

    // Get district coverage
    const districtCoverage = await Vendor.aggregate([
      { $match: filter },
      { $group: { _id: '$address.district', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        vendors: {
          total: totalVendors,
          active: activeVendors,
          pending: pendingVendors
        },
        members: {
          total: totalMembers,
          active: activeMembers
        },
        events: {
          total: totalEvents,
          upcoming: upcomingEvents
        },
        bod: {
          total: totalBOD,
          active: activeBOD
        },
        associations: {
          total: totalAssociations,
          active: activeAssociations
        },
        growthRate: growthRate,
        districtCoverage: districtCoverage.length
      }
    });

  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching dashboard statistics'
    });
  }
});

// @desc    Get recent members
// @route   GET /api/dashboard/recent-members
// @access  Private
router.get('/recent-members', [
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
], async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Build filter for district-based access
    const filter = {};
    if (req.user.role === 'sub-admin') {
      filter['address.district'] = req.user.district;
    }

    // Get recent members
    const recentMembers = await Member.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('name businessName phone city state createdAt profileImage associationName')
      .populate('createdBy', 'name');

    // Format members data
    const members = recentMembers.map(member => ({
      memberId: member._id,
      name: member.name,
      businessName: member.businessName,
      phone: member.phone,
      associationName: member.associationName,
      dateAdded: member.createdAt,
      profileImage: member.profileImage,
      city: member.city,
      state: member.state,
      createdBy: member.createdBy?.name || 'Admin'
    }));

    res.status(200).json({
      success: true,
      members
    });

  } catch (error) {
    console.error('Get recent members error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching recent members'
    });
  }
});

// @desc    Get district coverage data
// @route   GET /api/dashboard/district-coverage
// @access  Private
router.get('/district-coverage', async (req, res) => {
  try {
    // Build filter for district-based access
    const filter = {};
    if (req.user.role === 'sub-admin') {
      filter['address.district'] = req.user.district;
    }

    // Get district coverage for vendors
    const vendorDistrictCoverage = await Vendor.aggregate([
      { $match: filter },
      { $group: { _id: '$address.district', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get district coverage for members
    const memberDistrictCoverage = await Member.aggregate([
      { $match: filter },
      { $group: { _id: '$city', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Get district coverage for associations
    const associationDistrictCoverage = await Association.aggregate([
      { $match: filter },
      { $group: { _id: '$address.district', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      districtCoverage: {
        vendors: vendorDistrictCoverage,
        members: memberDistrictCoverage,
        associations: associationDistrictCoverage
      }
    });

  } catch (error) {
    console.error('Get district coverage error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching district coverage'
    });
  }
});

// @desc    Get growth trends
// @route   GET /api/dashboard/growth-trends
// @access  Private
router.get('/growth-trends', [
  query('period').optional().isIn(['weekly', 'monthly', 'yearly']).withMessage('Period must be weekly, monthly, or yearly')
], async (req, res) => {
  try {
    const period = req.query.period || 'monthly';
    
    // Build filter for district-based access
    const filter = {};
    if (req.user.role === 'sub-admin') {
      filter['address.district'] = req.user.district;
    }

    let dateFormat, dateRange;
    const now = new Date();

    if (period === 'weekly') {
      dateFormat = '%Y-%U'; // Year-Week
      dateRange = 12; // Last 12 weeks
    } else if (period === 'monthly') {
      dateFormat = '%Y-%m'; // Year-Month
      dateRange = 12; // Last 12 months
    } else {
      dateFormat = '%Y'; // Year
      dateRange = 5; // Last 5 years
    }

    // Get vendor growth trends
    const vendorTrends = await Vendor.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get member growth trends
    const memberTrends = await Member.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get event growth trends
    const eventTrends = await Event.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.status(200).json({
      success: true,
      growthTrends: {
        period,
        vendors: vendorTrends,
        members: memberTrends,
        events: eventTrends
      }
    });

  } catch (error) {
    console.error('Get growth trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching growth trends'
    });
  }
});
// @desc    Get associations for map display
// @route   GET /api/dashboard/associations-map
// @access  Private
router.get('/associations-map', async (req, res) => {
  try {
    // Build filter for district-based access
    const filter = {};
    if (req.user.role === 'sub-admin') {
      filter['address.district'] = req.user.district;
    }

    // Get associations with address information for map
    const associations = await Association.find(filter)
      .select('name address.city address.state address.district status memberCount createdAt')
      .sort({ createdAt: -1 });

    // Format associations data for map
    const mapData = associations.map(association => ({
      id: association._id,
      name: association.name,
      city: association.address?.city || 'Unknown',
      state: association.address?.state || 'Unknown',
      district: association.address?.district || 'Unknown',
      status: association.status,
      memberCount: association.memberCount || 0,
      createdAt: association.createdAt
    }));

    res.status(200).json({
      success: true,
      associations: mapData
    });

  } catch (error) {
    console.error('Get associations for map error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching associations for map'
    });
  }
});
// @desc    Get monthly member growth data for current year
// @route   GET /api/dashboard/monthly-member-growth
// @access  Private
router.get('/monthly-member-growth', async (req, res) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    
    // Build filter for district-based access
    const filter = {};
    if (req.user.role === 'sub-admin') {
      filter['address.district'] = req.user.district;
    }

    // Get monthly member counts for the specified year
    const monthlyData = await Member.aggregate([
      { $match: filter },
      {
        $match: {
          createdAt: {
            $gte: new Date(year, 0, 1),
            $lt: new Date(year + 1, 0, 1)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          membersJoined: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Format data to include all months with 0 for months without data
    const formattedData = [];
    for (let month = 1; month <= 12; month++) {
      const monthData = monthlyData.find(item => item._id === month);
      formattedData.push({
        month,
        membersJoined: monthData ? monthData.membersJoined : 0
      });
    }

    res.status(200).json({
      success: true,
      monthlyData: formattedData
    });

  } catch (error) {
    console.error('Get monthly member growth error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching monthly member growth'
    });
  }
});
// @desc    Get top associations with growth comparison
// @route   GET /api/dashboard/top-associations
// @access  Private
router.get('/top-associations', async (req, res) => {
  try {
    
    const { limit = 10 } = req.query;
    
    // Build filter for district-based access
    const filter = {};
    if (req.user.role === 'sub-admin') {
      filter['address.district'] = req.user.district;
    }
    console.log('User role:', req.user.role);
    console.log('User district:', req.user.district);
    console.log('Filter being applied:', filter);
    // Get current year and last year
    const currentYear = new Date().getFullYear();
    const lastYear = currentYear - 1;

      // Get associations with member counts for both years
      const associations = await Association.find(filter)
      .select('name address.city address.state address.district status memberCount createdAt')
      .sort({ memberCount: -1 })
      .limit(parseInt(limit));

    console.log('Found associations:', associations.length);
    console.log('Associations:', associations.map(a => ({ name: a.name, city: a.address?.city, state: a.address?.state })));

    // Calculate growth percentage for each association
    const associationsWithGrowth = await Promise.all(
      associations.map(async (association) => {
        console.log(`Processing association: ${association.name}`);
        
        // Get member count for current year
        const currentYearMembers = await Member.countDocuments({
          associationName: association.name,
          createdAt: {
            $gte: new Date(currentYear, 0, 1),
            $lt: new Date(currentYear + 1, 0, 1)
          }
        });

        // Get member count for last year
        const lastYearMembers = await Member.countDocuments({
          associationName: association.name,
          createdAt: {
            $gte: new Date(lastYear, 0, 1),
            $lt: new Date(lastYear + 1, 0, 1)
          }
        });

        console.log(`${association.name}: Current year: ${currentYearMembers}, Last year: ${lastYearMembers}`);

        // Calculate growth percentage
        let growthPercentage = 0;
        if (lastYearMembers > 0) {
          growthPercentage = ((currentYearMembers - lastYearMembers) / lastYearMembers) * 100;
        } else if (currentYearMembers > 0) {
          growthPercentage = 100; // 100% growth if no members last year
        }

        const result = {
          id: association._id,
          name: association.name,
          city: association.address?.city || 'Unknown',
          state: association.address?.state || 'Unknown',
          district: association.address?.district || 'Unknown',
          status: association.status,
          memberCount: currentYearMembers,
          growthPercentage: Math.round(growthPercentage * 10) / 10 // Round to 1 decimal place
        };
        
        console.log(`Result for ${association.name}:`, result);
        return result;
      })
    );

    console.log('Final associations with growth:', associationsWithGrowth);
    console.log('Response being sent:', { success: true, associations: associationsWithGrowth });
    console.log('Response associations length:', associationsWithGrowth.length);
    console.log('Response associations type:', typeof associationsWithGrowth);
    console.log('Response associations isArray:', Array.isArray(associationsWithGrowth));
    
    res.status(200).json({
      success: true,
      associations: associationsWithGrowth
    });

  } catch (error) {
    console.error('Get top associations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching top associations'
    });
  }
});
module.exports = router;
