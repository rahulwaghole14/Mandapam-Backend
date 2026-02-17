# 📁 Multer Upload Configuration for Render Disk Storage

## Overview

This document describes the comprehensive multer configuration optimized for Render's persistent disk storage. The system provides centralized file upload management with proper error handling, file validation, and utility functions.

## 🚀 Key Features

- **Render Disk Storage**: Optimized for Render's persistent disk storage
- **Multiple Upload Types**: Profile images, business images, gallery images, event images
- **File Validation**: Image type validation and size limits
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Utility Functions**: File management, deletion, and information retrieval
- **CORS Support**: Proper CORS headers for cross-origin requests
- **Security**: File type validation and size restrictions

## 📁 File Structure

```
config/
├── multerConfig.js          # Centralized multer configuration
routes/
├── uploadRoutes.js          # Admin upload routes
└── mobileUploadRoutes.js    # Mobile upload routes
uploads/                     # Render disk storage directory
├── profile-images/          # Profile images (auto-created)
├── business-images/         # Business images (auto-created)
├── gallery-images/          # Gallery images (auto-created)
└── event-images/            # Event images (auto-created)
```

## 🔧 Configuration Details

### **Storage Configuration**
```javascript
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use Render's persistent disk storage
    const uploadDir = path.join(process.cwd(), 'uploads');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
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
```

### **File Size Limits**
| Upload Type | File Size Limit | Max Files | Purpose |
|-------------|----------------|-----------|---------|
| **Profile Images** | 5MB | 1 | User profile pictures |
| **Business Images** | 5MB | 10 | Business portfolio images |
| **Gallery Images** | 10MB | 20 | Event gallery images |
| **Event Images** | 10MB | 15 | Event documentation |
| **Documents** | 10MB | 5 | PDF, Word, text files |

### **File Type Validation**
```javascript
// Image files only
const imageFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Document files
const documentFilter = (req, file, cb) => {
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
```

## 📋 API Endpoints

### **Admin Upload Routes (`/api/upload`)**

#### **1. Upload Profile Image**
```http
POST /api/upload/profile-image
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

Form Data:
- image: [file] (required, max 5MB)
```

**Response:**
```json
{
  "success": true,
  "message": "Profile image uploaded successfully",
  "file": {
    "filename": "profile-1703123456789-123456789.jpg",
    "originalName": "profile.jpg",
    "size": 1024000,
    "mimetype": "image/jpeg",
    "url": "https://your-domain.com/uploads/profile-1703123456789-123456789.jpg",
    "localUrl": "/uploads/profile-1703123456789-123456789.jpg"
  }
}
```

#### **2. Upload Business Images**
```http
POST /api/upload/business-images
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

Form Data:
- images: [files] (required, max 10 files, 5MB each)
```

**Response:**
```json
{
  "success": true,
  "message": "3 business image(s) uploaded successfully",
  "files": [
    {
      "filename": "business1-1703123456789-123456789.jpg",
      "originalName": "business1.jpg",
      "size": 2048000,
      "mimetype": "image/jpeg",
      "url": "https://your-domain.com/uploads/business1-1703123456789-123456789.jpg",
      "localUrl": "/uploads/business1-1703123456789-123456789.jpg"
    }
  ]
}
```

#### **3. Upload Gallery Images**
```http
POST /api/upload/gallery-images
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

Form Data:
- images: [files] (required, max 20 files, 10MB each)
```

#### **4. Upload Event Images**
```http
POST /api/upload/event-images
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

Form Data:
- images: [files] (required, max 15 files, 10MB each)
```

#### **5. Delete File**
```http
DELETE /api/upload/:filename
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully",
  "filename": "profile-1703123456789-123456789.jpg"
}
```

#### **6. Get File Information**
```http
GET /api/upload/info/:filename
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "file": {
    "filename": "profile-1703123456789-123456789.jpg",
    "size": 1024000,
    "created": "2023-12-21T10:30:45.123Z",
    "modified": "2023-12-21T10:30:45.123Z",
    "url": "https://your-domain.com/uploads/profile-1703123456789-123456789.jpg"
  }
}
```

### **Mobile Upload Routes (`/api/mobile/upload`)**

#### **1. Upload Profile Image**
```http
POST /api/mobile/upload/profile-image
Authorization: Bearer <mobile_token>
Content-Type: multipart/form-data

Form Data:
- image: [file] (required, max 5MB)
```

#### **2. Upload Business Images**
```http
POST /api/mobile/upload/business-images
Authorization: Bearer <mobile_token>
Content-Type: multipart/form-data

Form Data:
- images: [files] (required, max 10 files, 5MB each)
```

#### **3. Upload Gallery Images**
```http
POST /api/mobile/upload/gallery-images
Authorization: Bearer <mobile_token>
Content-Type: multipart/form-data

Form Data:
- images: [files] (required, max 20 files, 10MB each)
```

#### **4. Delete File**
```http
DELETE /api/mobile/upload/:filename
Authorization: Bearer <mobile_token>
```

#### **5. Get File Information**
```http
GET /api/mobile/upload/info/:filename
Authorization: Bearer <mobile_token>
```

## 🔒 Error Handling

### **Multer Errors**
```javascript
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
  
  // File type errors
  if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({
      success: false,
      message: 'Only image files are allowed. Please upload a valid image file.'
    });
  }
  
  // Generic error
  console.error('Multer error:', error);
  return res.status(500).json({
    success: false,
    message: 'File upload error occurred.'
  });
};
```

### **Common Error Responses**

#### **File Too Large**
```json
{
  "success": false,
  "message": "File too large. Please upload a smaller file.",
  "maxSize": "5MB for images, 10MB for documents"
}
```

#### **Too Many Files**
```json
{
  "success": false,
  "message": "Too many files. Please upload fewer files.",
  "maxFiles": "10 images, 5 documents"
}
```

#### **Invalid File Type**
```json
{
  "success": false,
  "message": "Only image files are allowed. Please upload a valid image file."
}
```

#### **File Not Found**
```json
{
  "success": false,
  "message": "File not found"
}
```

## 🛠️ Utility Functions

### **Get File URL**
```javascript
const getFileUrl = (filename, baseUrl = '') => {
  return `${baseUrl}/uploads/${filename}`;
};
```

### **Delete File**
```javascript
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
```

### **Check File Exists**
```javascript
const fileExists = (filename) => {
  const filePath = path.join(process.cwd(), 'uploads', filename);
  return fs.existsSync(filePath);
};
```

### **Get File Information**
```javascript
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
```

## 🚀 Render Deployment Configuration

### **Environment Variables**
```bash
# No additional environment variables needed
# Uploads are stored in Render's persistent disk storage
```

### **Directory Structure on Render**
```
/opt/render/project/src/
├── uploads/                 # Persistent disk storage
│   ├── profile-images/      # Auto-created
│   ├── business-images/     # Auto-created
│   ├── gallery-images/      # Auto-created
│   └── event-images/        # Auto-created
├── config/
│   └── multerConfig.js      # Multer configuration
└── routes/
    ├── uploadRoutes.js      # Admin routes
    └── mobileUploadRoutes.js # Mobile routes
```

### **Static File Serving**
```javascript
// In server.js
const uploadsPath = path.join(process.cwd(), 'uploads');

// Static file serving with CORS headers
app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res, path) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  }
}));
```

## 📱 Mobile App Integration

### **React Native Upload Example**
```javascript
import { launchImageLibrary } from 'react-native-image-picker';

const uploadProfileImage = async (token) => {
  try {
    // Launch image picker
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1024,
      maxHeight: 1024,
    });

    if (result.assets && result.assets[0]) {
      const image = result.assets[0];
      
      // Create form data
      const formData = new FormData();
      formData.append('image', {
        uri: image.uri,
        type: image.type,
        name: image.fileName || 'profile.jpg',
      });

      // Upload to server
      const response = await fetch(`${API_BASE_URL}/api/mobile/upload/profile-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('Upload successful:', data.file.url);
        return data.file;
      } else {
        throw new Error(data.message);
      }
    }
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};
```

### **Web Upload Example**
```javascript
const uploadFile = async (file, token, endpoint) => {
  try {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    const data = await response.json();
    
    if (data.success) {
      return data.file || data.files;
    } else {
      throw new Error(data.message);
    }
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

// Usage
const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (file) {
    try {
      const result = await uploadFile(file, token, '/api/upload/profile-image');
      console.log('Upload successful:', result.url);
    } catch (error) {
      console.error('Upload failed:', error.message);
    }
  }
});
```

## 🔧 Configuration Options

### **Custom File Size Limits**
```javascript
// In multerConfig.js
const customUpload = multer({
  storage: storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
    files: 50 // 50 files
  },
  fileFilter: imageFilter
});
```

### **Custom File Naming**
```javascript
// In multerConfig.js
filename: function (req, file, cb) {
  // Custom naming: userID-timestamp.extension
  const userId = req.user?.id || 'anonymous';
  const timestamp = Date.now();
  const extension = path.extname(file.originalname);
  
  const filename = `${userId}-${timestamp}${extension}`;
  cb(null, filename);
}
```

### **Custom Directory Structure**
```javascript
// In multerConfig.js
destination: function (req, file, cb) {
  // Create subdirectories based on file type
  const uploadDir = path.join(process.cwd(), 'uploads', file.fieldname);
  
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  cb(null, uploadDir);
}
```

## 📊 Performance Considerations

### **File Size Optimization**
- **Profile Images**: 5MB limit, optimized for mobile
- **Business Images**: 5MB limit, good quality for portfolios
- **Gallery Images**: 10MB limit, high quality for events
- **Event Images**: 10MB limit, documentation quality

### **Caching Strategy**
- **Static Files**: 1-year cache for uploaded images
- **CORS Headers**: Proper cross-origin support
- **CDN Ready**: URLs can be easily moved to CDN

### **Storage Management**
- **Automatic Cleanup**: Files can be deleted via API
- **File Information**: Metadata available for management
- **Render Persistent**: Files survive server restarts

## 🚀 Deployment Checklist

### **Pre-Deployment**
- ✅ **Test file uploads** in development
- ✅ **Verify file size limits** work correctly
- ✅ **Test error handling** for various scenarios
- ✅ **Check CORS configuration** for cross-origin requests

### **Deployment**
- ✅ **Deploy to Render** with persistent disk storage
- ✅ **Verify uploads directory** is created
- ✅ **Test file serving** via static routes
- ✅ **Monitor file uploads** and storage usage

### **Post-Deployment**
- ✅ **Test all upload endpoints** in production
- ✅ **Verify file URLs** are accessible
- ✅ **Monitor error rates** and file upload success
- ✅ **Set up monitoring** for storage usage

---

**Last Updated**: September 19, 2025  
**Version**: 1.0.0  
**Author**: Development Team
