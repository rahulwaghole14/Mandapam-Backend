const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OTP = sequelize.define('OTP', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  mobileNumber: {
    type: DataTypes.STRING(15),
    allowNull: false,
    field: 'mobile_number',
    validate: {
      is: /^[0-9+\-\s()]+$/
    }
  },
  otp: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  isUsed: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_used'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at'
  },
  attempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'otps',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['mobile_number', 'is_used']
    },
    {
      fields: ['expires_at']
    }
  ]
});

module.exports = OTP;