const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EventRegistration = sequelize.define('EventRegistration', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  eventId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'event_id',
    references: {
      model: 'events',
      key: 'id'
    },
    onDelete: 'CASCADE'
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
  status: {
    type: DataTypes.ENUM('registered', 'cancelled', 'attended', 'no_show'),
    allowNull: false,
    defaultValue: 'registered'
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
    allowNull: false,
    defaultValue: 'pending',
    field: 'payment_status'
  },
  amountPaid: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'amount_paid'
  },
  paymentOrderId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'payment_order_id'
  },
  paymentId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'payment_id'
  },
  registeredAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'registered_at'
  },
  attendedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'attended_at'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'event_registrations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      unique: true,
      fields: ['event_id', 'member_id'],
      name: 'unique_event_member_registration'
    },
    { fields: ['payment_status'] },
    { fields: ['status'] }
  ],
  validate: {
    // Custom validation to ensure only one active registration per member per event
    uniqueActiveRegistration() {
      // This will be handled by the unique index, but we can add additional validation here if needed
    }
  }
});

module.exports = EventRegistration;
