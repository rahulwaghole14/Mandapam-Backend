/**
 * Comprehensive Logging Utility
 * Works in both development and production
 * Logs are visible in Render server logs
 */

const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Log file paths
const errorLogPath = path.join(logsDir, 'error.log');
const accessLogPath = path.join(logsDir, 'access.log');
const qrCheckinLogPath = path.join(logsDir, 'qr-checkin.log');

/**
 * Format timestamp for logs
 */
function getTimestamp() {
  return new Date().toISOString();
}

/**
 * Format log entry
 */
function formatLog(level, message, data = {}) {
  const timestamp = getTimestamp();
  const dataStr = Object.keys(data).length > 0 ? ` | Data: ${JSON.stringify(data)}` : '';
  return `[${timestamp}] [${level}] ${message}${dataStr}\n`;
}

/**
 * Write to log file (async, non-blocking)
 */
function writeToFile(filePath, content) {
  fs.appendFile(filePath, content, (err) => {
    if (err) {
      // Fallback to console if file write fails
      console.error('Failed to write to log file:', err.message);
    }
  });
}

/**
 * Logger class with different log levels
 */
class Logger {
  /**
   * Log error with full context
   */
  static error(message, error = null, context = {}) {
    const errorData = {
      message,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
        code: error.code
      } : null,
      ...context
    };

    const logEntry = formatLog('ERROR', message, errorData);
    
    // Always log to console (visible in Render logs)
    console.error(logEntry.trim());
    
    // Also write to error log file
    writeToFile(errorLogPath, logEntry);
  }

  /**
   * Log warning
   */
  static warn(message, context = {}) {
    const logEntry = formatLog('WARN', message, context);
    console.warn(logEntry.trim());
    writeToFile(errorLogPath, logEntry);
  }

  /**
   * Log info
   */
  static info(message, context = {}) {
    const logEntry = formatLog('INFO', message, context);
    console.log(logEntry.trim());
    writeToFile(accessLogPath, logEntry);
  }

  /**
   * Log debug (only in development)
   */
  static debug(message, context = {}) {
    if (process.env.NODE_ENV === 'development') {
      const logEntry = formatLog('DEBUG', message, context);
      console.log(logEntry.trim());
    }
  }

  /**
   * Log API request
   */
  static request(req, res, responseTime = null) {
    const context = {
      method: req.method,
      url: req.url,
      path: req.path,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      statusCode: res.statusCode,
      responseTime: responseTime ? `${responseTime}ms` : null
    };

    const logEntry = formatLog('REQUEST', `${req.method} ${req.path}`, context);
    console.log(logEntry.trim());
    writeToFile(accessLogPath, logEntry);
  }

  /**
   * Log QR check-in specific events
   */
  static qrCheckin(level, message, data = {}) {
    const logEntry = formatLog(level, `[QR Check-in] ${message}`, data);
    
    if (level === 'ERROR') {
      console.error(logEntry.trim());
      writeToFile(errorLogPath, logEntry);
    } else {
      console.log(logEntry.trim());
      writeToFile(qrCheckinLogPath, logEntry);
    }
  }

  /**
   * Log API error with full context
   */
  static apiError(endpoint, error, req = null) {
    const context = {
      endpoint,
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack
      },
      request: req ? {
        method: req.method,
        url: req.url,
        body: req.body,
        query: req.query,
        params: req.params,
        ip: req.ip,
        userAgent: req.get('user-agent')
      } : null
    };

    this.error(`API Error: ${endpoint}`, error, context);
  }

  /**
   * Log timeout error
   */
  static timeout(endpoint, timeoutMs, req = null) {
    const context = {
      endpoint,
      timeout: `${timeoutMs}ms`,
      request: req ? {
        method: req.method,
        url: req.url,
        ip: req.ip
      } : null
    };

    this.error(`Request Timeout: ${endpoint}`, new Error(`Request exceeded ${timeoutMs}ms`), context);
  }

  /**
   * Log network error
   */
  static networkError(endpoint, error, req = null) {
    const context = {
      endpoint,
      errorType: error.code || 'NETWORK_ERROR',
      message: error.message,
      request: req ? {
        method: req.method,
        url: req.url,
        ip: req.ip
      } : null
    };

    this.error(`Network Error: ${endpoint}`, error, context);
  }
}

module.exports = Logger;






