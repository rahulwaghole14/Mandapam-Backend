const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { 
  profileImageUpload, 
  businessImagesUpload, 
  galleryImagesUpload,
  eventImagesUpload,
  handleMulterError,
  getFileUrl,
  deleteFile,
  getFileInfo
} = require('../config/multerConfig');

const router = express.Router();

// @desc    Upload profile image
// @route   POST /api/upload/profile-image
// @access  Private
router.post('/profile-image', protect, profileImageUpload.single('image'), handleMulterError, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Get the base URL for the file
    const baseUrl = req.protocol + '://' + req.get('host');
    const fileUrl = getFileUrl(req.file.filename, baseUrl);

    // Return the file information for storage in database
    res.status(200).json({
      success: true,
      message: 'Profile image uploaded successfully',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: fileUrl,
        localUrl: `/uploads/${req.file.filename}`
      }
    });

  } catch (error) {
    console.error('Profile image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading profile image'
    });
  }
});

// @desc    Upload business images
// @route   POST /api/upload/business-images
// @access  Private
router.post('/business-images', protect, businessImagesUpload.array('images', 10), handleMulterError, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided'
      });
    }

    const baseUrl = req.protocol + '://' + req.get('host');
    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      url: getFileUrl(file.filename, baseUrl),
      localUrl: `/uploads/${file.filename}`
    }));

    res.status(200).json({
      success: true,
      message: `${req.files.length} business image(s) uploaded successfully`,
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Business images upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading business images'
    });
  }
});

// @desc    Upload gallery images
// @route   POST /api/upload/gallery-images
// @access  Private
router.post('/gallery-images', protect, galleryImagesUpload.array('images', 20), handleMulterError, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided'
      });
    }

    const baseUrl = req.protocol + '://' + req.get('host');
    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      url: getFileUrl(file.filename, baseUrl),
      localUrl: `/uploads/${file.filename}`
    }));

    res.status(200).json({
      success: true,
      message: `${req.files.length} gallery image(s) uploaded successfully`,
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Gallery images upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading gallery images'
    });
  }
});

// @desc    Upload event images
// @route   POST /api/upload/event-images
// @access  Private
router.post('/event-images', protect, eventImagesUpload.array('images', 15), handleMulterError, async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided'
      });
    }

    const baseUrl = req.protocol + '://' + req.get('host');
    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      url: getFileUrl(file.filename, baseUrl),
      localUrl: `/uploads/${file.filename}`
    }));

    res.status(200).json({
      success: true,
      message: `${req.files.length} event image(s) uploaded successfully`,
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Event images upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading event images'
    });
  }
});

// @desc    Delete uploaded file
// @route   DELETE /api/upload/:filename
// @access  Private
router.delete('/:filename', protect, async (req, res) => {
  try {
    const { filename } = req.params;

    if (!filename) {
      return res.status(400).json({
        success: false,
        message: 'Filename is required'
      });
    }

    // Check if file exists
    if (!getFileInfo(filename)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Delete the file
    await deleteFile(filename);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully',
      filename: filename
    });

  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting file'
    });
  }
});

// @desc    Get file information
// @route   GET /api/upload/info/:filename
// @access  Private
router.get('/info/:filename', protect, async (req, res) => {
  try {
    const { filename } = req.params;

    if (!filename) {
      return res.status(400).json({
        success: false,
        message: 'Filename is required'
      });
    }

    const fileInfo = getFileInfo(filename);

    if (!fileInfo) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    res.status(200).json({
      success: true,
      file: fileInfo
    });

  } catch (error) {
    console.error('Get file info error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting file information'
    });
  }
});

module.exports = router;