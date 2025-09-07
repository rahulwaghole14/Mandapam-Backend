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

  // User associations for createdBy and updatedBy
  User.hasMany(Vendor, {
    foreignKey: 'createdBy',
    as: 'createdVendors'
  });
  Vendor.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'createdByUser'
  });

  User.hasMany(Vendor, {
    foreignKey: 'updatedBy',
    as: 'updatedVendors'
  });
  Vendor.belongsTo(User, {
    foreignKey: 'updatedBy',
    as: 'updatedByUser'
  });

  User.hasMany(Vendor, {
    foreignKey: 'verifiedBy',
    as: 'verifiedVendors'
  });
  Vendor.belongsTo(User, {
    foreignKey: 'verifiedBy',
    as: 'verifiedByUser'
  });

  // User associations for Member
  User.hasMany(Member, {
    foreignKey: 'createdBy',
    as: 'createdMembers'
  });
  Member.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'createdByUser'
  });

  User.hasMany(Member, {
    foreignKey: 'updatedBy',
    as: 'updatedMembers'
  });
  Member.belongsTo(User, {
    foreignKey: 'updatedBy',
    as: 'updatedByUser'
  });

  // User associations for Event
  User.hasMany(Event, {
    foreignKey: 'createdBy',
    as: 'createdEvents'
  });
  Event.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'createdByUser'
  });

  User.hasMany(Event, {
    foreignKey: 'updatedBy',
    as: 'updatedEvents'
  });
  Event.belongsTo(User, {
    foreignKey: 'updatedBy',
    as: 'updatedByUser'
  });

  // User associations for BOD
  User.hasMany(BOD, {
    foreignKey: 'createdBy',
    as: 'createdBODs'
  });
  BOD.belongsTo(User, {
    foreignKey: 'createdBy',
    as: 'createdByUser'
  });

  User.hasMany(BOD, {
    foreignKey: 'updatedBy',
    as: 'updatedBODs'
  });
  BOD.belongsTo(User, {
    foreignKey: 'updatedBy',
    as: 'updatedByUser'
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
