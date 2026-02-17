const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Gallery = sequelize.define('Gallery', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  entityType: {
    type: DataTypes.ENUM('event', 'member', 'association', 'vendor'),
    allowNull: false,
    field: 'entity_type',
    validate: {
      isIn: [['event', 'member', 'association', 'vendor']]
    }
  },
  entityId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'entity_id',
    validate: {
      isInt: true,
      min: 1
    }
  },
  filename: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 255]
    }
  },
  originalName: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'original_name'
  },
  caption: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  altText: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'alt_text'
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'display_order',
    validate: {
      min: 0
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  isFeatured: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_featured'
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'file_size',
    validate: {
      min: 0
    }
  },
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'mime_type'
  },
  uploadedBy: {
    type: DataTypes.INTEGER,
    allowNull: true, // Made nullable to support both users and members
    field: 'uploaded_by'
    // Removed foreign key constraint as it can reference either users or members
  }
}, {
  tableName: 'gallery',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['entity_type', 'entity_id']
    },
    {
      fields: ['entity_type', 'entity_id', 'display_order']
    },
    {
      fields: ['is_active']
    },
    {
      fields: ['is_featured']
    }
  ]
});

module.exports = Gallery;