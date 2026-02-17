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

  // Override res.json to log response (simplified format)
  const originalJson = res.json.bind(res);
  res.json = function(data) {
    const responseTime = Date.now() - startTime;
    
    // Simplified log format: [METHOD] path | status | time | data
    const logData = {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      time: `${responseTime}ms`
    };
    
    // Only include request body for POST/PUT/PATCH and errors
    if ((req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') && req.body && Object.keys(req.body).length > 0) {
      // Exclude sensitive fields
      const sanitizedBody = { ...req.body };
      if (sanitizedBody.password) delete sanitizedBody.password;
      if (sanitizedBody.token) delete sanitizedBody.token;
      if (sanitizedBody.refreshToken) delete sanitizedBody.refreshToken;
      logData.body = sanitizedBody;
    }
    
    // Include error message if present
    if (data.success === false) {
      logData.error = data.message || data.error || 'Unknown error';
      if (data.errors) logData.errors = data.errors;
    }
    
    // Include response data for errors or small responses
    if (data.success === false || (data.data && JSON.stringify(data.data).length < 500)) {
      logData.response = data;
    }
    
    // Clean, single-line log format
    console.log(`[${req.method}] ${req.path} | ${res.statusCode} | ${responseTime}ms`, JSON.stringify(logData));
    
    return originalJson(data);
  };

  // Handle errors
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    
    // Log slow requests only
    if (responseTime > 5000) {
      console.log(`⚠️ Slow request: ${req.method} ${req.path} | ${responseTime}ms`);
    }
  });

  next();
};

module.exports = requestLogger;






