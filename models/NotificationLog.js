const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NotificationLog = sequelize.define('NotificationLog', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'user_id',
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  memberId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'member_id',
    references: {
      model: 'members',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('event', 'app_update'),
    allowNull: false
  },
  eventId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'event_id',
    references: {
      model: 'events',
      key: 'id'
    },
    onDelete: 'SET NULL'
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'sent_at'
  },
  status: {
    type: DataTypes.ENUM('sent', 'failed'),
    allowNull: false,
    defaultValue: 'sent'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'error_message'
  }
}, {
  tableName: 'notification_logs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['member_id']
    },
    {
      fields: ['type']
    },
    {
      fields: ['sent_at']
    },
    {
      fields: ['status']
    }
  ],
  validate: {
    eitherUserOrMember() {
      if ((!this.userId && !this.memberId) || (this.userId && this.memberId)) {
        throw new Error('Either userId or memberId must be provided, but not both');
      }
    }
  }
});

module.exports = NotificationLog;
