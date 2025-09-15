const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, authorize } = require('../middleware/authMiddleware');
const memberImportService = require('../services/memberImportService');

const router = express.Router();

// Apply protection to all routes
router.use(protect);
router.use(authorize('admin'));

// CSV Import endpoint
router.post('/import-csv', [
  body('members').isArray({ min: 1, max: 1000 }).withMessage('Members must be an array with 1-1000 items'),
  body('members.*.name').notEmpty().withMessage('Name is required'),
  body('members.*.businessName').notEmpty().withMessage('Business name is required'),
  body('members.*.businessType').optional().isIn(['catering', 'sound', 'mandap', 'madap', 'light', 'decorator', 'photography', 'videography', 'transport', 'other']).withMessage('Invalid business type'),
  body('members.*.phone').isMobilePhone('en-IN').withMessage('Invalid phone number'),
  body('members.*.email').optional().isEmail().withMessage('Invalid email'),
  body('members.*.city').notEmpty().withMessage('City is required'),
  body('members.*.state').notEmpty().withMessage('State is required'),
  body('members.*.district').optional().notEmpty().withMessage('District cannot be empty if provided'),
  body('members.*.associationName').notEmpty().withMessage('Association name is required'),
  body('members.*.birthDate').optional().isISO8601().withMessage('Invalid birth date format'),
  body('members.*.gstNumber').optional().matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).withMessage('Invalid GST number format'),
  body('members.*.experience').optional().isInt({ min: 0, max: 100 }).withMessage('Experience must be between 0-100 years'),
  body('members.*.pincode').optional().matches(/^[0-9]{6}$/).withMessage('Pincode must be 6 digits'),
  body('members.*.address').optional().isLength({ max: 500 }).withMessage('Address cannot exceed 500 characters'),
  body('members.*.description').optional().isLength({ max: 1000 }).withMessage('Description cannot exceed 1000 characters')
], async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    console.log(`Starting CSV import for ${req.body.members.length} members by user ${req.user.id}`);

    const result = await memberImportService.importMembers(req.body.members, req.user.id);
    
    console.log(`CSV import completed: ${result.summary.imported} imported, ${result.summary.failed} failed, ${result.summary.skipped} skipped`);

    res.status(200).json({
      success: true,
      message: 'Import completed',
      ...result
    });

  } catch (error) {
    console.error('CSV Import Error:', error);
    res.status(500).json({
      success: false,
      message: 'Import failed due to server error',
      error: error.message
    });
  }
});

// Get import status endpoint (for future async processing)
router.get('/import-status/:jobId', async (req, res) => {
  try {
    // This endpoint can be used for future async processing implementation
    res.status(200).json({
      success: true,
      message: 'Import status endpoint - to be implemented for async processing'
    });
  } catch (error) {
    console.error('Import status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get import status',
      error: error.message
    });
  }
});

module.exports = router;
