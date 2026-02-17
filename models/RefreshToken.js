const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RefreshToken = sequelize.define('RefreshToken', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  token: {
    type: DataTypes.TEXT,
    allowNull: false,
    unique: true
  },
  memberId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'member_id',
    references: {
      model: 'members',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at'
  },
  isRevoked: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_revoked'
  },
  deviceInfo: {
    type: DataTypes.JSON,
    allowNull: true,
    field: 'device_info'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    field: 'ip_address'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent'
  },
  lastUsedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_used_at'
  }
}, {
  tableName: 'refresh_tokens',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['member_id']
    },
    {
      fields: ['token']
    },
    {
      fields: ['expires_at']
    },
    {
      fields: ['is_revoked']
    }
  ]
});

module.exports = RefreshToken;
