const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const FCMToken = sequelize.define('FCMToken', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  token: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true
  },
  deviceType: {
    type: DataTypes.ENUM('android', 'ios'),
    allowNull: false,
    field: 'device_type'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  lastUsedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_used_at'
  }
}, {
  tableName: 'fcm_tokens',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['token']
    },
    {
      fields: ['is_active']
    }
  ]
});

module.exports = FCMToken;
