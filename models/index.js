const { sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Association = require('./Association');
const Member = require('./Member');
const Event = require('./Event');
const Vendor = require('./Vendor');
const BOD = require('./BOD');
const OTP = require('./OTP');
const AppVersion = require('./AppVersion');
const Gallery = require('./Gallery');
const FCMToken = require('./FCMToken');
const NotificationLog = require('./NotificationLog');
const EventRegistration = require('./EventRegistration');
const RefreshToken = require('./RefreshToken');
const WhatsAppConfig = require('./WhatsAppConfig');

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

  // Events are independent - no association relationship

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

  // Gallery associations
  User.hasMany(Gallery, {
    foreignKey: 'uploadedBy',
    as: 'uploadedImages'
  });
  Gallery.belongsTo(User, {
    foreignKey: 'uploadedBy',
    as: 'uploadedByUser'
  });

  // Member can also upload gallery images
  Member.hasMany(Gallery, {
    foreignKey: 'uploadedBy',
    as: 'uploadedImages'
  });
  Gallery.belongsTo(Member, {
    foreignKey: 'uploadedBy',
    as: 'uploadedByMember'
  });

  // Event has many Gallery images
  Event.hasMany(Gallery, {
    foreignKey: 'entityId',
    constraints: false,
    scope: {
      entityType: 'event'
    },
    as: 'galleryImages'
  });

  // Member has many Gallery images
  Member.hasMany(Gallery, {
    foreignKey: 'entityId',
    constraints: false,
    scope: {
      entityType: 'member'
    },
    as: 'galleryImages'
  });

  // Association has many Gallery images
  Association.hasMany(Gallery, {
    foreignKey: 'entityId',
    constraints: false,
    scope: {
      entityType: 'association'
    },
    as: 'galleryImages'
  });

  // Vendor has many Gallery images
  Vendor.hasMany(Gallery, {
    foreignKey: 'entityId',
    constraints: false,
    scope: {
      entityType: 'vendor'
    },
    as: 'galleryImages'
  });

  // User has many FCM tokens
  User.hasMany(FCMToken, {
    foreignKey: 'userId',
    as: 'fcmTokens'
  });
  FCMToken.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
  });

  // Member has many FCM tokens
  Member.hasMany(FCMToken, {
    foreignKey: 'memberId',
    as: 'fcmTokens'
  });
  FCMToken.belongsTo(Member, {
    foreignKey: 'memberId',
    as: 'member'
  });

  // User has many Notification logs
  User.hasMany(NotificationLog, {
    foreignKey: 'userId',
    as: 'notificationLogs'
  });
  NotificationLog.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user'
  });

  // Member has many Notification logs
  Member.hasMany(NotificationLog, {
    foreignKey: 'memberId',
    as: 'notificationLogs'
  });
  NotificationLog.belongsTo(Member, {
    foreignKey: 'memberId',
    as: 'member'
  });

  // Event has many Notification logs
  Event.hasMany(NotificationLog, {
    foreignKey: 'eventId',
    as: 'notificationLogs'
  });
  NotificationLog.belongsTo(Event, {
    foreignKey: 'eventId',
    as: 'event'
  });

  // Event Registration associations
  // Event has many registrations
  Event.hasMany(EventRegistration, {
    foreignKey: 'eventId',
    as: 'registrations'
  });
  EventRegistration.belongsTo(Event, {
    foreignKey: 'eventId',
    as: 'event'
  });

  // Member has many event registrations
  Member.hasMany(EventRegistration, {
    foreignKey: 'memberId',
    as: 'eventRegistrations'
  });
  EventRegistration.belongsTo(Member, {
    foreignKey: 'memberId',
    as: 'member'
  });

  // Refresh Token associations
  Member.hasMany(RefreshToken, {
    foreignKey: 'memberId',
    as: 'refreshTokens'
  });
  RefreshToken.belongsTo(Member, {
    foreignKey: 'memberId',
    as: 'member'
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
  OTP,
  AppVersion,
  Gallery,
  FCMToken,
  NotificationLog,
  EventRegistration,
  RefreshToken,
  WhatsAppConfig
};
