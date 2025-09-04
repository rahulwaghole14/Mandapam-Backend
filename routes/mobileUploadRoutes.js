const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protectMobile } = require('../middleware/mobileAuthMiddleware');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'mobile-' + file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter for images
const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: fileFilter
});

// @desc    Upload profile image
// @route   POST /api/mobile/upload/profile-image
// @access  Private
router.post('/upload/profile-image', protectMobile, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Return the file information for storage in database
    res.status(200).json({
      success: true,
      message: 'Profile image uploaded successfully',
      file: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        url: `/uploads/${req.file.filename}`
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

// @desc    Upload multiple images
// @route   POST /api/mobile/upload/images
// @access  Private
router.post('/upload/images', protectMobile, upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided'
      });
    }

    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      url: `/uploads/${file.filename}`
    }));

    res.status(200).json({
      success: true,
      message: `${req.files.length} image(s) uploaded successfully`,
      files: uploadedFiles
    });

  } catch (error) {
    console.error('Multiple images upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading images'
    });
  }
});

// @desc    Delete uploaded file
// @route   DELETE /api/mobile/upload/:filename
// @access  Private
router.delete('/upload/:filename', protectMobile, async (req, res) => {
  try {
    const filename = req.params.filename;
    const filepath = path.join(__dirname, '../uploads', filename);

    // Check if file exists
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Delete file
    fs.unlinkSync(filepath);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting file'
    });
  }
});

// @desc    Get file info
// @route   GET /api/mobile/upload/:filename
// @access  Private
router.get('/upload/:filename', protectMobile, async (req, res) => {
  try {
    const filename = req.params.filename;
    const filepath = path.join(__dirname, '../uploads', filename);

    // Check if file exists
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Get file stats
    const stats = fs.statSync(filepath);
    const fileInfo = {
      filename: filename,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      url: `/uploads/${filename}`
    };

    res.status(200).json({
      success: true,
      file: fileInfo
    });

  } catch (error) {
    console.error('Get file info error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting file info'
    });
  }
});

// @desc    Get upload info
// @route   GET /api/mobile/upload
// @access  Private
router.get('/upload', protectMobile, (req, res) => {
  res.json({ 
    message: 'Mobile Upload API is working!',
    endpoints: {
      'POST /profile-image': 'Upload profile image (multipart/form-data with "image" field)',
      'POST /images': 'Upload multiple images (multipart/form-data with "images" field)',
      'GET /:filename': 'Get file information',
      'DELETE /:filename': 'Delete uploaded file'
    },
    limits: {
      maxFileSize: '5MB',
      allowedTypes: 'Images only (jpg, png, gif, webp)',
      maxFiles: '5 files per request'
    }
  });
});

module.exports = router;
