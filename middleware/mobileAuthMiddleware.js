const jwt = require('jsonwebtoken');
const { Member } = require('../models');

// Mobile-specific authentication middleware
const protectMobile = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header and trim whitespace
      token = req.headers.authorization.split(' ')[1].trim();

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Check if it's a mobile user token
      if (decoded.userType !== 'member') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token type. This endpoint is for mobile app users only.'
        });
      }

      // Get member from token
      req.user = await Member.findByPk(decoded.id);
      
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Member not found'
        });
      }

      if (!req.user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated. Please contact administrator.'
        });
      }

      next();
    } catch (error) {
      console.error('Mobile token verification error:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Not authorized, token failed';
      if (error.name === 'JsonWebTokenError') {
        errorMessage = 'Invalid token format';
      } else if (error.name === 'TokenExpiredError') {
        errorMessage = 'Token has expired';
      } else if (error.name === 'NotBeforeError') {
        errorMessage = 'Token not active yet';
      }
      
      return res.status(401).json({
        success: false,
        message: errorMessage,
        error: error.name
      });
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, no token'
    });
  }
};

// Optional mobile authentication (for public endpoints that can work with or without auth)
const optionalMobileAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1].trim();
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.userType === 'member') {
        req.user = await Member.findByPk(decoded.id);
      }
    } catch (error) {
      // Ignore token errors for optional auth
      console.log('Optional auth token error (ignored):', error.message);
    }
  }

  next();
};

module.exports = {
  protectMobile,
  optionalMobileAuth
};
