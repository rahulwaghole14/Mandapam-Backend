const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Gallery = require('../models/Gallery');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// Apply protection to all routes
router.use(protect);

// Configure multer for multiple image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'gallery-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 10 // Maximum 10 files at once
  },
  fileFilter: fileFilter
});

// @desc    Get gallery images for an entity
// @route   GET /api/gallery/:entityType/:entityId
// @access  Private
router.get('/:entityType/:entityId', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('featured').optional().isBoolean().withMessage('Featured must be a boolean')
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

    const { entityType, entityId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const featured = req.query.featured === 'true';
    const offset = (page - 1) * limit;

    // Validate entity type
    const validEntityTypes = ['event', 'member', 'association', 'vendor'];
    if (!validEntityTypes.includes(entityType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid entity type. Must be one of: event, member, association, vendor'
      });
    }

    // Build where clause
    const whereClause = {
      entityType,
      entityId: parseInt(entityId),
      isActive: true
    };

    if (featured) {
      whereClause.isFeatured = true;
    }

    // Get images with pagination
    const { count, rows: images } = await Gallery.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'uploadedByUser',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [
        ['isFeatured', 'DESC'],
        ['displayOrder', 'ASC'],
        ['created_at', 'DESC']
      ],
      limit,
      offset
    });

    // Calculate pagination info
    const totalPages = Math.ceil(count / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    res.status(200).json({
      success: true,
      images: images.map(image => ({
        id: image.id,
        entityType: image.entityType,
        entityId: image.entityId,
        filename: image.filename,
        originalName: image.originalName,
        caption: image.caption,
        altText: image.altText,
        displayOrder: image.displayOrder,
        isActive: image.isActive,
        isFeatured: image.isFeatured,
        fileSize: image.fileSize,
        mimeType: image.mimeType,
        uploadedBy: image.uploadedBy,
        createdAt: image.createdAt,
        updatedAt: image.updatedAt,
        uploadedByUser: image.uploadedByUser,
        imageURL: `/uploads/${image.filename}`
      })),
      pagination: {
        currentPage: page,
        totalPages,
        totalImages: count,
        hasNext,
        hasPrev
      }
    });

  } catch (error) {
    console.error('Get gallery images error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching gallery images'
    });
  }
});

// @desc    Upload gallery images
// @route   POST /api/gallery/:entityType/:entityId
// @access  Private
router.post('/:entityType/:entityId', [
  body('captions').optional().isArray().withMessage('Captions must be an array'),
  body('altTexts').optional().isArray().withMessage('Alt texts must be an array')
], upload.array('images', 10), async (req, res) => {
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

    const { entityType, entityId } = req.params;
    
    // Handle captions and altTexts - they might come as arrays or individual fields
    let captions = [];
    let altTexts = [];
    
    // Check if captions is an array or needs to be converted
    if (req.body.captions) {
      if (Array.isArray(req.body.captions)) {
        // If it's an array, check if it's an array of characters (single string split)
        if (req.body.captions.length > 1 && req.body.captions.every(item => typeof item === 'string' && item.length === 1)) {
          // This is likely a single string that was split into characters
          captions = [req.body.captions.join('')];
        } else {
          // Normal array of captions
          captions = req.body.captions;
        }
      } else {
        // If it's a string, try to parse it as JSON first, then convert to array
        let captionValue = req.body.captions;
        try {
          // Check if it's a JSON string (starts with [ or {)
          if (typeof captionValue === 'string' && (captionValue.startsWith('[') || captionValue.startsWith('{'))) {
            const parsed = JSON.parse(captionValue);
            if (Array.isArray(parsed)) {
              captions = parsed;
            } else {
              captions = [parsed];
            }
          } else {
            // Regular string, convert to array
            captions = [captionValue];
          }
        } catch (e) {
          // If JSON parsing fails, treat as regular string
          captions = [captionValue];
        }
      }
    }
    
    // Check if altTexts is an array or needs to be converted
    if (req.body.altTexts) {
      if (Array.isArray(req.body.altTexts)) {
        // If it's an array, check if it's an array of characters (single string split)
        if (req.body.altTexts.length > 1 && req.body.altTexts.every(item => typeof item === 'string' && item.length === 1)) {
          // This is likely a single string that was split into characters
          altTexts = [req.body.altTexts.join('')];
        } else {
          // Normal array of altTexts
          altTexts = req.body.altTexts;
        }
      } else {
        // If it's a string, try to parse it as JSON first, then convert to array
        let altTextValue = req.body.altTexts;
        try {
          // Check if it's a JSON string (starts with [ or {)
          if (typeof altTextValue === 'string' && (altTextValue.startsWith('[') || altTextValue.startsWith('{'))) {
            const parsed = JSON.parse(altTextValue);
            if (Array.isArray(parsed)) {
              altTexts = parsed;
            } else {
              altTexts = [parsed];
            }
          } else {
            // Regular string, convert to array
            altTexts = [altTextValue];
          }
        } catch (e) {
          // If JSON parsing fails, treat as regular string
          altTexts = [altTextValue];
        }
      }
    }
    
    // Handle the case where captions might be sent as individual fields like captions[0], captions[1], etc.
    if (captions.length === 0) {
      const captionKeys = Object.keys(req.body).filter(key => key.startsWith('captions['));
      if (captionKeys.length > 0) {
        captions = captionKeys
          .sort((a, b) => {
            const indexA = parseInt(a.match(/\[(\d+)\]/)[1]);
            const indexB = parseInt(b.match(/\[(\d+)\]/)[1]);
            return indexA - indexB;
          })
          .map(key => {
            const value = req.body[key];
            // Check if the value is a JSON string that needs parsing
            if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
              try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed[0] : parsed;
              } catch (e) {
                return value; // Return original value if parsing fails
              }
            }
            return value;
          });
      }
    }
    
    // Handle the case where caption is sent as singular field
    if (captions.length === 0 && req.body.caption) {
      captions = [req.body.caption];
    }
    
    // Handle the case where altTexts might be sent as individual fields like altTexts[0], altTexts[1], etc.
    if (altTexts.length === 0) {
      const altTextKeys = Object.keys(req.body).filter(key => key.startsWith('altTexts['));
      if (altTextKeys.length > 0) {
        altTexts = altTextKeys
          .sort((a, b) => {
            const indexA = parseInt(a.match(/\[(\d+)\]/)[1]);
            const indexB = parseInt(b.match(/\[(\d+)\]/)[1]);
            return indexA - indexB;
          })
          .map(key => {
            const value = req.body[key];
            // Check if the value is a JSON string that needs parsing
            if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
              try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed[0] : parsed;
              } catch (e) {
                return value; // Return original value if parsing fails
              }
            }
            return value;
          });
      }
    }
    
    // Handle the case where altText is sent as singular field
    if (altTexts.length === 0 && req.body.altText) {
      altTexts = [req.body.altText];
    }
    
    // Debug logging for captions (can be removed in production)
    console.log('=== GALLERY UPLOAD DEBUG ===');
    console.log('req.body keys:', Object.keys(req.body));
    console.log('captions received:', captions);
    console.log('altTexts received:', altTexts);

    // Validate entity type
    const validEntityTypes = ['event', 'member', 'association', 'vendor'];
    if (!validEntityTypes.includes(entityType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid entity type. Must be one of: event, member, association, vendor'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images provided'
      });
    }

    // Get current max display order for this entity
    const maxOrder = await Gallery.max('displayOrder', {
      where: {
        entityType,
        entityId: parseInt(entityId),
        isActive: true
      }
    });

    let currentOrder = (maxOrder || 0) + 1;

    // Prepare gallery records
    const galleryRecords = req.files.map((file, index) => {
      const record = {
      entityType,
      entityId: parseInt(entityId),
      filename: file.filename,
      originalName: file.originalname,
        caption: captions.length > 0 ? (captions[index] || captions[0] || null) : null,
        altText: altTexts.length > 0 ? (altTexts[index] || altTexts[0] || null) : null,
      displayOrder: currentOrder + index,
      isActive: true,
      isFeatured: false,
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedBy: req.user.id
      };
      
      // Debug logging for each record (can be removed in production)
      console.log(`Gallery record ${index + 1}:`, {
        filename: record.filename,
        caption: record.caption,
        altText: record.altText
      });
      
      return record;
    });

    // Create gallery records
    const createdImages = await Gallery.bulkCreate(galleryRecords, {
      returning: true
    });
    
    // Debug logging for created images (can be removed in production)
    console.log('=== CREATED IMAGES DEBUG ===');
    createdImages.forEach((image, index) => {
      console.log(`Created image ${index + 1}:`, {
        id: image.id,
        filename: image.filename,
        caption: image.caption,
        altText: image.altText
      });
    });

    res.status(201).json({
      success: true,
      message: `${createdImages.length} images uploaded successfully`,
      images: createdImages.map(image => ({
        id: image.id,
        entityType: image.entityType,
        entityId: image.entityId,
        filename: image.filename,
        originalName: image.originalName,
        caption: image.caption,
        altText: image.altText,
        displayOrder: image.displayOrder,
        isActive: image.isActive,
        isFeatured: image.isFeatured,
        fileSize: image.fileSize,
        mimeType: image.mimeType,
        uploadedBy: image.uploadedBy,
        createdAt: image.createdAt,
        updatedAt: image.updatedAt,
        imageURL: `/uploads/${image.filename}`
      }))
    });

  } catch (error) {
    console.error('Upload gallery images error:', error);
    
    // Clean up uploaded files if database operation fails
    if (req.files) {
      req.files.forEach(file => {
        const filePath = path.join(__dirname, '../uploads', file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while uploading images'
    });
  }
});

// @desc    Update gallery image
// @route   PUT /api/gallery/:id
// @access  Private
router.put('/:id', [
  body('caption').optional().isLength({ max: 1000 }).withMessage('Caption cannot exceed 1000 characters'),
  body('altText').optional().isLength({ max: 255 }).withMessage('Alt text cannot exceed 255 characters'),
  body('displayOrder').optional().isInt({ min: 0 }).withMessage('Display order must be a non-negative integer'),
  body('isFeatured').optional().isBoolean().withMessage('Is featured must be a boolean')
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

    const { id } = req.params;
    const { caption, altText, displayOrder, isFeatured } = req.body;

    // Find the image
    const image = await Gallery.findByPk(id, {
      include: [
        {
          model: User,
          as: 'uploadedByUser',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // If setting as featured, unfeature all other images of the same entity
    if (isFeatured === true) {
      await Gallery.update(
        { isFeatured: false },
        {
          where: {
            entityType: image.entityType,
            entityId: image.entityId,
            id: { [Op.ne]: id }
          }
        }
      );
    }

    // Update the image
    const updateData = {};
    if (caption !== undefined) updateData.caption = caption;
    if (altText !== undefined) updateData.altText = altText;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured;

    await image.update(updateData);

    // Refresh the image data
    await image.reload();

    res.status(200).json({
      success: true,
      message: 'Image updated successfully',
      image: {
        id: image.id,
        entityType: image.entityType,
        entityId: image.entityId,
        filename: image.filename,
        originalName: image.originalName,
        caption: image.caption,
        altText: image.altText,
        displayOrder: image.displayOrder,
        isActive: image.isActive,
        isFeatured: image.isFeatured,
        fileSize: image.fileSize,
        mimeType: image.mimeType,
        uploadedBy: image.uploadedBy,
        createdAt: image.createdAt,
        updatedAt: image.updatedAt,
        uploadedByUser: image.uploadedByUser,
        imageURL: `/uploads/${image.filename}`
      }
    });

  } catch (error) {
    console.error('Update gallery image error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating image'
    });
  }
});

// @desc    Delete gallery image
// @route   DELETE /api/gallery/:id
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Find the image
    const image = await Gallery.findByPk(id);

    if (!image) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }

    // Delete the file from filesystem
    const filePath = path.join(__dirname, '../uploads', image.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete the database record
    await image.destroy();

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully'
    });

  } catch (error) {
    console.error('Delete gallery image error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting image'
    });
  }
});

// @desc    Reorder gallery images
// @route   PUT /api/gallery/:entityType/:entityId/reorder
// @access  Private
router.put('/:entityType/:entityId/reorder', [
  body('imageIds').isArray({ min: 1 }).withMessage('imageIds must be a non-empty array'),
  body('imageIds.*').isInt({ min: 1 }).withMessage('Each image ID must be a positive integer')
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

    const { entityType, entityId } = req.params;
    const { imageIds } = req.body;

    // Validate entity type
    const validEntityTypes = ['event', 'member', 'association', 'vendor'];
    if (!validEntityTypes.includes(entityType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid entity type. Must be one of: event, member, association, vendor'
      });
    }

    // Verify all images belong to the specified entity
    const images = await Gallery.findAll({
      where: {
        id: { [Op.in]: imageIds },
        entityType,
        entityId: parseInt(entityId),
        isActive: true
      }
    });

    if (images.length !== imageIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some images do not belong to the specified entity'
      });
    }

    // Update display order for each image
    const updatePromises = imageIds.map((imageId, index) => {
      return Gallery.update(
        { displayOrder: index + 1 },
        { where: { id: imageId } }
      );
    });

    await Promise.all(updatePromises);

    res.status(200).json({
      success: true,
      message: 'Images reordered successfully'
    });

  } catch (error) {
    console.error('Reorder gallery images error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while reordering images'
    });
  }
});

// @desc    Get gallery statistics
// @route   GET /api/gallery/:entityType/:entityId/stats
// @access  Private
router.get('/:entityType/:entityId/stats', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    // Validate entity type
    const validEntityTypes = ['event', 'member', 'association', 'vendor'];
    if (!validEntityTypes.includes(entityType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid entity type. Must be one of: event, member, association, vendor'
      });
    }

    // Get statistics
    const stats = await Gallery.findAll({
      where: {
        entityType,
        entityId: parseInt(entityId),
        isActive: true
      },
      attributes: [
        [Gallery.sequelize.fn('COUNT', Gallery.sequelize.col('id')), 'totalImages'],
        [Gallery.sequelize.fn('SUM', Gallery.sequelize.col('file_size')), 'totalSize'],
        [Gallery.sequelize.fn('AVG', Gallery.sequelize.col('file_size')), 'averageSize']
      ],
      raw: true
    });

    const result = stats[0] || { totalImages: 0, totalSize: 0, averageSize: 0 };

    res.status(200).json({
      success: true,
      stats: {
        totalImages: parseInt(result.totalImages) || 0,
        totalSize: parseInt(result.totalSize) || 0,
        averageSize: Math.round(parseFloat(result.averageSize) || 0)
      }
    });

  } catch (error) {
    console.error('Get gallery stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching gallery statistics'
    });
  }
});

module.exports = router;