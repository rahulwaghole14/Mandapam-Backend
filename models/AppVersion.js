const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AppVersion = sequelize.define('AppVersion', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  version: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [1, 20]
    }
  },
  platform: {
    type: DataTypes.ENUM('ios', 'android', 'both'),
    allowNull: false,
    defaultValue: 'both'
  },
  isLatest: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_latest'
  },
  isForceUpdate: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_force_update'
  },
  minSupportedVersion: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'min_supported_version'
  },
  releaseNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'release_notes'
  },
  releaseDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'release_date'
  },
  updateUrlIos: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'update_url_ios',
    validate: {
      isUrl: true
    }
  },
  updateUrlAndroid: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'update_url_android',
    validate: {
      isUrl: true
    }
  }
}, {
  tableName: 'app_versions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['version']
    },
    {
      fields: ['is_latest']
    },
    {
      fields: ['platform']
    }
  ]
});

module.exports = AppVersion;
