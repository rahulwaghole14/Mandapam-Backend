const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for WhatsApp sending endpoints
 * Prevents abuse and spam
 */
const whatsappRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 WhatsApp sends per 15 minutes (generous for normal use)
  message: {
    success: false,
    error: 'Too many WhatsApp send requests. Please try again after 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for authenticated admin/manager users
    // They need to send passes to multiple users
    try {
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        const jwt = require('jsonwebtoken');
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Skip for admin, manager, sub-admin roles
        if (['admin', 'manager', 'sub-admin'].includes(decoded.role)) {
          return true;
        }
      }
    } catch (error) {
      // Invalid token or no token - apply rate limit
    }
    return false;
  }
});

/**
 * Rate limiter for payment confirmation endpoint
 * Stricter limit to prevent payment abuse
 */
const paymentConfirmationRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 payment confirmations per 15 minutes (very generous for normal use)
  message: {
    success: false,
    error: 'Too many payment confirmation requests. Please try again after 15 minutes.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  whatsappRateLimiter,
  paymentConfirmationRateLimiter
};

