const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
      console.log('Auth Middleware - Token received:', token);

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('Auth Middleware - Token decoded:', decoded);

      // Get user from token
      req.user = await User.findById(decoded.id).select('-password');
      console.log('Auth Middleware - User found:', req.user);

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      next();
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token failed'
      });
    }
  }

  if (!token) {
    console.log('Auth Middleware - No token provided');
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    // Flatten the roles array in case it's nested
    const flatRoles = roles.flat();
    console.log('Auth Middleware - Authorize check for roles:', flatRoles);
    console.log('Auth Middleware - Current user:', req.user);
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!flatRoles.includes(req.user.role)) {
      console.log('Auth Middleware - User role not authorized:', req.user.role);
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }

    console.log('Auth Middleware - User authorized for role:', req.user.role);
    next();
  };
};

// District-based authorization for sub-admins
const authorizeDistrict = (req, res, next) => {
  if (req.user.role === 'admin') {
    return next(); // Admin can access all districts
  }

  if (req.user.role === 'sub-admin') {
    // Check if the resource belongs to the sub-admin's district
    const resourceDistrict = req.body.district || req.params.district;
    
    if (resourceDistrict && resourceDistrict !== req.user.district) {
      return res.status(403).json({
        success: false,
        message: `Sub-admin can only access resources in ${req.user.district} district`
      });
    }
  }

  next();
};

module.exports = {
  protect,
  authorize,
  authorizeDistrict
};
