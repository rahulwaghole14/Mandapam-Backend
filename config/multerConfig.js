const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Determine the base upload directory (for Render persistent disk)
const UPLOADS_BASE_DIR = path.join(process.cwd(), 'uploads');

// Helper function to create storage for different upload types
const createStorage = (subDir) => multer.diskStorage({
  destination: function (req, file, cb) {
    // Use Render's persistent disk storage with subdirectories
    const uploadDir = path.join(UPLOADS_BASE_DIR, subDir);
    
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

// Create base uploads directory
if (!fs.existsSync(UPLOADS_BASE_DIR)) {
  fs.mkdirSync(UPLOADS_BASE_DIR, { recursive: true });
  console.log('📁 Created base uploads directory:', UPLOADS_BASE_DIR);
}

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
  storage: createStorage('images'),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for images
    files: 10 // Maximum 10 files
  },
  fileFilter: imageFilter
});

const documentUpload = multer({
  storage: createStorage('documents'),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for documents
    files: 5 // Maximum 5 files
  },
  fileFilter: documentFilter
});

const generalUpload = multer({
  storage: createStorage('general'),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1 // Single file
  },
  fileFilter: allFilesFilter
});

// Profile image upload (single image, 5MB)
const profileImageUpload = multer({
  storage: createStorage('profile-images'),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: imageFilter
});

// Business images upload (multiple images, 5MB each)
const businessImagesUpload = multer({
  storage: createStorage('business-images'),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10 // Maximum 10 business images
  },
  fileFilter: imageFilter
});

// Gallery images upload (multiple images, 10MB each)
const galleryImagesUpload = multer({
  storage: createStorage('gallery-images'),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 20 // Maximum 20 gallery images
  },
  fileFilter: imageFilter
});

// Event images upload (multiple images, 10MB each)
const eventImagesUpload = multer({
  storage: createStorage('event-images'),
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
// @param {string} filename - Filename (may include path)
// @param {string} baseUrl - Base URL for the file
// @param {string} defaultSubDir - Default subdirectory if filename has no path (e.g., 'event-images', 'profile-images')
const getFileUrl = (filename, baseUrl = '', defaultSubDir = 'event-images') => {
  if (!filename) return null;
  
  // Handle filenames that might already contain a path
  // Remove any leading slashes or path separators
  const cleanFilename = filename.replace(/^\/+/, '').replace(/\\/g, '/');
  
  // Check if filename already contains a subdirectory path
  const pathParts = cleanFilename.split('/');
  
  if (pathParts.length > 1) {
    // Filename contains a path like "mandap-events/image.jpg"
    const actualFilename = pathParts[pathParts.length - 1];
    const subDir = pathParts[0];
    
    // Known subdirectories - use as-is
    const knownSubDirs = ['event-images', 'profile-images', 'business-images', 'gallery-images', 'documents', 'images', 'general'];
    if (knownSubDirs.includes(subDir)) {
      return `${baseUrl}/uploads/${cleanFilename}`;
    }
    
    // Unknown subdirectory - extract filename and use default subdirectory
    // This handles cases like "mandap-events/image.jpg" -> "/uploads/event-images/image.jpg"
    return `${baseUrl}/uploads/${defaultSubDir}/${actualFilename}`;
  }
  
  // No path in filename - use default subdirectory
  return `${baseUrl}/uploads/${defaultSubDir}/${cleanFilename}`;
};

// Utility function to delete file
const deleteFile = (filename) => {
  return new Promise((resolve, reject) => {
    const subDirs = ['profile-images', 'business-images', 'gallery-images', 'event-images', 'documents', 'images', 'general'];
    
    // Try to find and delete the file in any subdirectory
    for (const subDir of subDirs) {
      const filePath = path.join(UPLOADS_BASE_DIR, subDir, filename);
      if (fs.existsSync(filePath)) {
        fs.unlink(filePath, (error) => {
          if (error) {
            console.error('Error deleting file:', error);
            reject(error);
          } else {
            console.log('File deleted successfully:', filename);
            resolve(true);
          }
        });
        return;
      }
    }
    
    // Fallback to flat structure
    const filePath = path.join(UPLOADS_BASE_DIR, filename);
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
  const subDirs = ['profile-images', 'business-images', 'gallery-images', 'event-images', 'documents', 'images', 'general'];
  
  // Check if file exists in any subdirectory
  for (const subDir of subDirs) {
    const filePath = path.join(UPLOADS_BASE_DIR, subDir, filename);
    if (fs.existsSync(filePath)) {
      return true;
    }
  }
  
  // Fallback to flat structure
  const filePath = path.join(UPLOADS_BASE_DIR, filename);
  return fs.existsSync(filePath);
};

// Utility function to get file info
const getFileInfo = (filename) => {
  const subDirs = ['profile-images', 'business-images', 'gallery-images', 'event-images', 'documents', 'images', 'general'];
  
  // Check if file exists in any subdirectory
  for (const subDir of subDirs) {
    const filePath = path.join(UPLOADS_BASE_DIR, subDir, filename);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return {
        filename: filename,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        url: getFileUrl(filename)
      };
    }
  }
  
  // Fallback to flat structure
  const filePath = path.join(UPLOADS_BASE_DIR, filename);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    return {
      filename: filename,
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      url: getFileUrl(filename)
    };
  }
  
  return null;
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
  
  // File filters
  imageFileFilter: imageFilter,
  documentFileFilter: documentFilter
};
