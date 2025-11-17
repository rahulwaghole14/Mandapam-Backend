/**
 * Client Error Logging Route
 * Receives error logs from frontend/mobile apps
 */

const express = require('express');
const Logger = require('../utils/logger');

const router = express.Router();

// @desc    Log client-side error
// @route   POST /api/logs/client-error
// @access  Public (for error logging)
router.post('/client-error', express.json(), async (req, res) => {
  try {
    const errorInfo = req.body;

    // Log the error with full context
    Logger.error('Client Error', null, {
      type: errorInfo.type || 'CLIENT_ERROR',
      endpoint: errorInfo.endpoint,
      error: errorInfo.error,
      request: errorInfo.request,
      response: errorInfo.response,
      context: errorInfo.context,
      timestamp: errorInfo.timestamp,
      qrToken: errorInfo.qrToken
    });

    // Return success (don't expose internal details)
    res.status(200).json({
      success: true,
      message: 'Error logged successfully'
    });
  } catch (error) {
    // Even if logging fails, don't break the client
    console.error('Failed to log client error:', error);
    res.status(200).json({
      success: true,
      message: 'Error logged'
    });
  }
});

module.exports = router;

