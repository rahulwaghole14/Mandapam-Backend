const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { Op } = require('sequelize');
const Gallery = require('../models/Gallery');
const Member = require('../models/Member');
const { protectMobile } = require('../middleware/mobileAuthMiddleware');
const { getFileUrl } = require('../config/multerConfig');

const router = express.Router();

// Note: Public routes don't need authentication
// Authentication is applied individually to protected routes

// @desc    Get all gallery images (mobile version)
// @route   GET /api/mobile/gallery
// @access  Public
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const gallery = await Gallery.findAndCountAll({
      where: { isActive: true },
      order: [['createdAt', 'DESC']],
      offset,
      limit
      // Removed include as association is not defined
    });

    const baseUrl = req.protocol + '://' + req.get('host');
    
    res.status(200).json({
      success: true,
      count: gallery.rows.length,
      total: gallery.count,
      page,
      pages: Math.ceil(gallery.count / limit),
      gallery: gallery.rows.map(image => {
        // Check if filename is already a Cloudinary URL
        let imageURL = image.filename;
        if (!image.filename.startsWith('http://') && !image.filename.startsWith('https://')) {
          // Legacy local file - generate URL
          imageURL = getFileUrl(image.filename, baseUrl, 'gallery-images');
        }
        return {
          ...image.toJSON(),
          imageURL: imageURL
        };
      })
    });

  } catch (error) {
    console.error('Get mobile gallery error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching gallery'
    });
  }
});


// @desc    Get gallery images for an entity (mobile version)
// @route   GET /api/mobile/gallery/:entityType/:entityId
// @access  Public
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
          model: Member,
          as: 'uploadedByMember',
          attributes: ['id', 'name', 'phone'],
          required: false
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

    const baseUrl = req.protocol + '://' + req.get('host');
    
    res.status(200).json({
      success: true,
      images: images.map(image => {
        // Check if filename is already a Cloudinary URL
        let imageURL = image.filename;
        if (!image.filename.startsWith('http://') && !image.filename.startsWith('https://')) {
          // Legacy local file - generate URL
          imageURL = getFileUrl(image.filename, baseUrl, 'gallery-images');
        }
        
        return {
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
          uploadedByMember: image.uploadedByMember,
          imageURL: imageURL
        };
      }),
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

// @desc    Upload gallery images (mobile version)
// @route   POST /api/mobile/gallery/:entityType/:entityId
// @access  Private (Mobile)
router.post('/:entityType/:entityId', protectMobile, [
  body('captions').optional().isArray().withMessage('Captions must be an array'),
  body('altTexts').optional().isArray().withMessage('Alt texts must be an array'),
  body('images').optional().custom((value) => {
    if (!value) return true; // Allow empty
    if (!Array.isArray(value)) return false;
    // Validate each image URL
    return value.every(img => {
      if (typeof img === 'string') {
        if (img.startsWith('http://') || img.startsWith('https://')) {
          return img.length <= 500; // Cloudinary URL
        }
        return img.length <= 255; // Legacy filename
      }
      return false;
    });
  }).withMessage('Images must be an array of Cloudinary URLs or filenames')
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
    const memberId = req.user.id; // This is memberId from mobileAuthMiddleware
    
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

    // Handle image URLs (Cloudinary or legacy files)
    const imageUrls = req.body.images || [];
    
    if (!imageUrls || imageUrls.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No images provided. Send images array with Cloudinary URLs.'
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

    // Prepare gallery records from Cloudinary URLs
    const galleryRecords = imageUrls.map((imageUrl, index) => {
      // Extract filename from URL or use URL itself
      let filename = imageUrl;
      let originalName = imageUrl;
      
      // If it's a Cloudinary URL, extract the filename part
      if (imageUrl.includes('cloudinary.com')) {
        const urlParts = imageUrl.split('/');
        originalName = urlParts[urlParts.length - 1].split('?')[0]; // Remove query params
        filename = imageUrl; // Store full URL
      }
      
      const record = {
        entityType,
        entityId: parseInt(entityId),
        filename: filename, // Store Cloudinary URL or legacy filename
        originalName: originalName,
        caption: captions.length > 0 ? (captions[index] || captions[0] || null) : null,
        altText: altTexts.length > 0 ? (altTexts[index] || altTexts[0] || null) : null,
        displayOrder: currentOrder + index,
        isActive: true,
        isFeatured: false,
        fileSize: null, // Cloudinary URLs don't have file size info
        mimeType: 'image/jpeg', // Default, can be determined from URL if needed
        uploadedBy: memberId // Use memberId for mobile uploads
      };
      
      return record;
    });

    // Create gallery records
    const createdImages = await Gallery.bulkCreate(galleryRecords, {
      returning: true
    });

    const baseUrl = req.protocol + '://' + req.get('host');
    
    res.status(201).json({
      success: true,
      message: `${createdImages.length} images uploaded successfully`,
      images: createdImages.map(image => {
        // Check if filename is already a Cloudinary URL
        let imageURL = image.filename;
        if (!image.filename.startsWith('http://') && !image.filename.startsWith('https://')) {
          // Legacy local file - generate URL
          imageURL = getFileUrl(image.filename, baseUrl, 'gallery-images');
        }
        
        return {
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
          imageURL: imageURL
        };
      })
    });

  } catch (error) {
    console.error('Upload gallery images error:', error);
    
    // No need to delete files for Cloudinary URLs - they're managed by Cloudinary

    res.status(500).json({
      success: false,
      message: 'Server error while uploading images'
    });
  }
});

// @desc    Update gallery image (mobile version)
// @route   PUT /api/mobile/gallery/:id
// @access  Private (Mobile)
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
          model: Member,
          as: 'uploadedByMember',
          attributes: ['id', 'name', 'phone'],
          required: false
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

    const baseUrl = req.protocol + '://' + req.get('host');
    
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
        uploadedByMember: image.uploadedByMember,
        imageURL: image.filename.startsWith('http://') || image.filename.startsWith('https://') 
          ? image.filename 
          : getFileUrl(image.filename, baseUrl, 'gallery-images')
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

// @desc    Delete gallery image (mobile version)
// @route   DELETE /api/mobile/gallery/:id
// @access  Private (Mobile)
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

    // Only delete local files, not Cloudinary URLs
    // Cloudinary URLs are managed by Cloudinary and shouldn't be deleted from local filesystem
    if (image.filename && !image.filename.startsWith('http://') && !image.filename.startsWith('https://')) {
      // It's a local file - try to delete it
      try {
        const path = require('path');
        const fs = require('fs');
        const filePath = path.join(__dirname, '../uploads', image.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('✅ Local file deleted:', image.filename);
        }
      } catch (fileError) {
        console.log('⚠️ Could not delete local file:', fileError.message);
        // Continue with database deletion even if file deletion fails
      }
    } else {
      console.log('ℹ️ Cloudinary URL - skipping local file deletion');
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
      message: 'Server error while deleting image',
      error: error.message
    });
  }
});

// @desc    Get gallery statistics (mobile version)
// @route   GET /api/mobile/gallery/:entityType/:entityId/stats
// @access  Private (Mobile)
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
