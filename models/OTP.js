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
    defaultValue: false
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false
  }
}, {
  tableName: 'otps',
  timestamps: true,
  indexes: [
    {
      fields: ['mobileNumber', 'isUsed']
    },
    {
      fields: ['expiresAt']
    }
  ]
});

module.exports = OTP;