const { sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Association = require('./Association');
const Member = require('./Member');
const Event = require('./Event');
const Vendor = require('./Vendor');
const BOD = require('./BOD');
const OTP = require('./OTP');

// Define associations
const defineAssociations = () => {
  // Association has many Members
  Association.hasMany(Member, {
    foreignKey: 'associationId',
    as: 'members'
  });
  Member.belongsTo(Association, {
    foreignKey: 'associationId',
    as: 'association'
  });

  // Association has many Vendors
  Association.hasMany(Vendor, {
    foreignKey: 'associationId',
    as: 'vendors'
  });
  Vendor.belongsTo(Association, {
    foreignKey: 'associationId',
    as: 'association'
  });

  // Association has many Events
  Association.hasMany(Event, {
    foreignKey: 'associationId',
    as: 'events'
  });
  Event.belongsTo(Association, {
    foreignKey: 'associationId',
    as: 'association'
  });

  // Association has many BOD members
  Association.hasMany(BOD, {
    foreignKey: 'associationId',
    as: 'boardMembers'
  });
  BOD.belongsTo(Association, {
    foreignKey: 'associationId',
    as: 'association'
  });
};

// Initialize associations
defineAssociations();

// Export all models and sequelize instance
module.exports = {
  sequelize,
  User,
  Association,
  Member,
  Event,
  Vendor,
  BOD,
  OTP
};
