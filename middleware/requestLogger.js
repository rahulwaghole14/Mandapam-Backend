/**
 * Request Logging Middleware
 * Logs all API requests with timing and error information
 */

const Logger = require('../utils/logger');

const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Attach request ID to request object for use in routes
  req.requestId = requestId;

  // Log request start
  Logger.info('Request started', {
    requestId,
    method: req.method,
    url: req.url,
    path: req.path,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent')
  });

  // Override res.json to log response
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    const responseTime = Date.now() - startTime;
    
    // Log response
    Logger.request(req, res, responseTime);
    
    // Log errors in response
    if (data.success === false) {
      Logger.warn('API Error Response', {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        error: data.message || data.error,
        responseTime: `${responseTime}ms`
      });
    }
    
    return originalJson(data);
  };

  // Handle errors
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    
    // Log slow requests
    if (responseTime > 5000) {
      Logger.warn('Slow request detected', {
        requestId,
        method: req.method,
        path: req.path,
        responseTime: `${responseTime}ms`,
        statusCode: res.statusCode
      });
    }
  });

  next();
};

module.exports = requestLogger;

