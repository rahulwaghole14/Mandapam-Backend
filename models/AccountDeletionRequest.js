const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AccountDeletionRequest = sequelize.define('AccountDeletionRequest', {
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
      is: /^[0-9]{10}$/
    }
  },
  memberId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'member_id',
    references: {
      model: 'members',
      key: 'id'
    }
  },
  memberName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'member_name'
  },
  memberBusinessName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'member_business_name'
  },
  memberEmail: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'member_email',
    validate: {
      isEmail: true
    }
  },
  otpVerified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'otp_verified'
  },
  status: {
    type: DataTypes.ENUM('pending', 'verified', 'processing', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  requestedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'requested_at'
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'verified_at'
  },
  deletionScheduledAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'deletion_scheduled_at'
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'completed_at'
  },
  cancellationReason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'cancellation_reason'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
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
  }
}, {
  tableName: 'account_deletion_requests',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['mobile_number']
    },
    {
      fields: ['status']
    },
    {
      fields: ['deletion_scheduled_at']
    },
    {
      fields: ['otp_verified']
    }
  ]
});

module.exports = AccountDeletionRequest;
