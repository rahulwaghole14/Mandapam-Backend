const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for Render disk storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use Render's persistent disk storage
    const uploadDir = path.join(process.cwd(), 'uploads');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
      console.log('📁 Created uploads directory:', uploadDir);
    }
    
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp and random suffix
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileExtension = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, fileExtension);
    
    // Create filename: basename-timestamp-random.extension
    const filename = `${baseName}-${uniqueSuffix}${fileExtension}`;
    
    cb(null, filename);
  }
});

// File filter for images
const imageFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// File filter for documents
const documentFilter = (req, file, cb) => {
  // Accept common document types
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed!'), false);
  }
};

// File filter for all files (with size limit)
const allFilesFilter = (req, file, cb) => {
  // Accept all file types but with size restrictions
  cb(null, true);
};

// Multer configurations for different use cases
const imageUpload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for images
    files: 10 // Maximum 10 files
  },
  fileFilter: imageFilter
});

const documentUpload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for documents
    files: 5 // Maximum 5 files
  },
  fileFilter: documentFilter
});

const generalUpload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Single file
  },
  fileFilter: allFilesFilter
});

// Profile image upload (single image, 5MB)
const profileImageUpload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: imageFilter
});

// Business images upload (multiple images, 5MB each)
const businessImagesUpload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10 // Maximum 10 business images
  },
  fileFilter: imageFilter
});

// Gallery images upload (multiple images, 10MB each)
const galleryImagesUpload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 20 // Maximum 20 gallery images
  },
  fileFilter: imageFilter
});

// Event images upload (multiple images, 10MB each)
const eventImagesUpload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 15 // Maximum 15 event images
  },
  fileFilter: imageFilter
});

// Error handling middleware
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Please upload a smaller file.',
        maxSize: '5MB for images, 10MB for documents'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Please upload fewer files.',
        maxFiles: '10 images, 5 documents'
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field. Please check the field name.'
      });
    }
  }
  
  if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({
      success: false,
      message: 'Only image files are allowed. Please upload a valid image file.'
    });
  }
  
  if (error.message === 'File type not allowed!') {
    return res.status(400).json({
      success: false,
      message: 'File type not allowed. Please upload a supported file type.'
    });
  }
  
  // Generic error
  console.error('Multer error:', error);
  return res.status(500).json({
    success: false,
    message: 'File upload error occurred.'
  });
};

// Utility function to get file URL
const getFileUrl = (filename, baseUrl = '') => {
  return `${baseUrl}/uploads/${filename}`;
};

// Utility function to delete file
const deleteFile = (filename) => {
  return new Promise((resolve, reject) => {
    const filePath = path.join(process.cwd(), 'uploads', filename);
    
    fs.unlink(filePath, (error) => {
      if (error) {
        console.error('Error deleting file:', error);
        reject(error);
      } else {
        console.log('File deleted successfully:', filename);
        resolve(true);
      }
    });
  });
};

// Utility function to check if file exists
const fileExists = (filename) => {
  const filePath = path.join(process.cwd(), 'uploads', filename);
  return fs.existsSync(filePath);
};

// Utility function to get file info
const getFileInfo = (filename) => {
  const filePath = path.join(process.cwd(), 'uploads', filename);
  
  if (!fs.existsSync(filePath)) {
    return null;
  }
  
  const stats = fs.statSync(filePath);
  return {
    filename: filename,
    size: stats.size,
    created: stats.birthtime,
    modified: stats.mtime,
    url: getFileUrl(filename)
  };
};

module.exports = {
  // Multer configurations
  imageUpload,
  documentUpload,
  generalUpload,
  profileImageUpload,
  businessImagesUpload,
  galleryImagesUpload,
  eventImagesUpload,
  
  // Error handling
  handleMulterError,
  
  // Utility functions
  getFileUrl,
  deleteFile,
  fileExists,
  getFileInfo,
  
  // Storage configuration
  storage
};
