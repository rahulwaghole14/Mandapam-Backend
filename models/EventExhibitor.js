const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const EventExhibitor = sequelize.define('EventExhibitor', {
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
  name: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  logo: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  businessCategory: {
    type: DataTypes.ENUM('Flower Decoration', 'Tent', 'Lighting', 'Sound', 'Furniture', 'Other'),
    allowNull: true,
    defaultValue: 'Other',
    field: 'business_category'
  }
}, {
  tableName: 'event_exhibitors',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = EventExhibitor;


