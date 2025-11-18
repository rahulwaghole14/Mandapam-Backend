# 📋 Comprehensive Logging Setup

## Overview

This project now includes comprehensive error and request logging that works in both development and production environments. All logs are visible in Render server logs.

## Backend Logging

### Logger Utility (`utils/logger.js`)

The logger provides multiple log levels and specialized logging functions:

- **Logger.error()** - Log errors with full context
- **Logger.warn()** - Log warnings
- **Logger.info()** - Log informational messages
- **Logger.debug()** - Log debug messages (development only)
- **Logger.request()** - Log API requests with timing
- **Logger.qrCheckin()** - Specialized QR check-in logging
- **Logger.apiError()** - Log API errors with full context
- **Logger.timeout()** - Log timeout errors
- **Logger.networkError()** - Log network errors

### Log Files

Logs are written to the `logs/` directory:
- `logs/error.log` - All errors and warnings
- `logs/access.log` - All requests and info logs
- `logs/qr-checkin.log` - QR check-in specific logs

**Note:** Log files are in `.gitignore` and won't be committed.

### Request Logging Middleware

All API requests are automatically logged with:
- Request method, URL, path
- IP address and user agent
- Response status code
- Response time
- Slow request detection (>5 seconds)

### QR Check-in Logging

The QR check-in endpoint includes detailed logging:
- Request received with token info
- Token parsing success/failure
- Signature verification results
- Registration lookup results
- Check-in success/failure
- Full error context on failures

## Frontend Logging

### Error Logger (`src/utils/errorLogger.js`)

The frontend error logger provides:

- **logError()** - Log general errors
- **logApiError()** - Log API errors with request/response context
- **logTimeout()** - Log timeout errors
- **logNetworkError()** - Log network errors
- **logQRCheckinError()** - Log QR check-in specific errors
- **setupErrorHandlers()** - Setup global error handlers

### Usage in Frontend

```javascript
import { logError, logApiError, logTimeout, setupErrorHandlers } from './utils/errorLogger';

// Setup global error handlers (call once in App.js)
setupErrorHandlers();

// Log an error
try {
  // some code
} catch (error) {
  logError(error, { context: 'additional info' });
}

// Log API error
axios.post('/api/endpoint', data)
  .catch(error => {
    logApiError('/api/endpoint', error, { method: 'POST', data });
  });

// Log timeout
if (requestTimeout) {
  logTimeout('/api/endpoint', 10000, { method: 'POST', data });
}
```

### Frontend Error Reporting

In production, errors are automatically sent to the backend logging endpoint (`/api/logs/client-error`) for centralized logging. This happens asynchronously and won't block the app.

## Viewing Logs

### Development

Logs appear in:
- **Console** - All logs are printed to console
- **Log files** - Check `logs/` directory

### Production (Render)

Logs are visible in:
- **Render Dashboard** - Go to your service → Logs tab
- All console.log/console.error output appears in Render logs
- Log files are also written to the server filesystem

### Viewing Log Files

```bash
# View error logs
tail -f logs/error.log

# View access logs
tail -f logs/access.log

# View QR check-in logs
tail -f logs/qr-checkin.log

# Search for specific errors
grep "QR Check-in" logs/error.log
```

## Log Format

All logs follow this format:
```
[ISO_TIMESTAMP] [LEVEL] Message | Data: {JSON_DATA}
```

Example:
```
[2025-11-17T10:30:00.000Z] [ERROR] [QR Check-in] QR token parsing failed | Data: {"requestId":"req_123","error":"Invalid base64"}
```

## Best Practices

1. **Use appropriate log levels:**
   - ERROR for errors that need attention
   - WARN for warnings
   - INFO for important events
   - DEBUG for detailed debugging (dev only)

2. **Include context:**
   - Always include request IDs, user info, endpoint, etc.
   - Don't log sensitive data (passwords, tokens)

3. **Check logs regularly:**
   - Monitor Render logs dashboard
   - Set up alerts for critical errors
   - Review logs/ directory periodically

4. **Frontend errors:**
   - Always log errors in catch blocks
   - Use specific loggers (logApiError, logTimeout, etc.)
   - Setup global error handlers early

## Example Log Output

### Successful QR Check-in
```
[2025-11-17T10:30:00.000Z] [INFO] [QR Check-in] QR Check-in request received | Data: {"requestId":"req_123","ip":"192.168.1.1"}
[2025-11-17T10:30:00.100Z] [INFO] [QR Check-in] QR token parsed successfully | Data: {"requestId":"req_123","registrationId":8634}
[2025-11-17T10:30:00.200Z] [INFO] [QR Check-in] Check-in successful | Data: {"requestId":"req_123","memberName":"John Doe","responseTime":"200ms"}
```

### Failed QR Check-in
```
[2025-11-17T10:30:00.000Z] [INFO] [QR Check-in] QR Check-in request received | Data: {"requestId":"req_124"}
[2025-11-17T10:30:00.050Z] [ERROR] [QR Check-in] QR token parsing failed | Data: {"requestId":"req_124","error":"Invalid base64","tokenPrefix":"EVT:eyJkYXRh"}
```

## Troubleshooting

### Logs not appearing in Render

1. Check that console.log/console.error are being called
2. Verify logs/ directory exists and is writable
3. Check Render service logs tab (not just build logs)

### Frontend errors not being logged

1. Ensure `setupErrorHandlers()` is called in App.js
2. Check browser console for errors
3. Verify API endpoint `/api/logs/client-error` is accessible
4. Check network tab for failed logging requests

### Too many logs

1. Adjust log levels (use WARN/ERROR in production)
2. Filter logs by level in log files
3. Use log rotation if needed

---

**Last Updated:** November 17, 2025



