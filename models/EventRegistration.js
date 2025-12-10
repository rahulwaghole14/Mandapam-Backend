const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Member = require('./Member');
const { deleteImage, isCloudinaryUrl } = require('../services/cloudinaryService');
const { deleteFile } = require('../config/multerConfig');

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
  // paymentMethod: Temporarily commented out - column doesn't exist in DB yet
  // Will be added via migration: ALTER TABLE event_registrations ADD COLUMN payment_method VARCHAR(20);
  // paymentMethod: {
  //   type: DataTypes.ENUM('razorpay', 'cash', 'free'),
  //   allowNull: true,
  //   field: 'payment_method'
  // },
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
  },
  pdfPath: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'pdf_path'
  },
  pdfSentAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'pdf_sent_at'
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
    { fields: ['status'] },
    { fields: ['payment_id'] }
    // Note: Unique index on payment_id is created via migration script
    // to support WHERE payment_id IS NOT NULL clause
  ],
  validate: {
    // Custom validation to ensure only one active registration per member per event
    uniqueActiveRegistration() {
      // This will be handled by the unique index, but we can add additional validation here if needed
    }
  }
});

module.exports = EventRegistration;

async function cleanupMemberMedia(memberId, options = {}) {
  if (!memberId) return;

  const transaction = options.transaction;

  try {
    const remainingCount = await EventRegistration.count({
      where: { memberId },
      transaction
    });

    if (remainingCount > 0) {
      return;
    }

    const member = await Member.findByPk(memberId, { transaction });
    if (!member || !member.profileImage) {
      return;
    }

    const profileImage = member.profileImage;
    let removed = false;

    if (isCloudinaryUrl(profileImage)) {
      const result = await deleteImage(profileImage);
      removed = result.deleted || result.reason === 'not-found';
      if (!removed && result.reason === 'cloudinary-not-configured') {
        console.warn(
          'Cloudinary delete skipped - credentials missing. Profile image not removed automatically.'
        );
      }
    } else {
      try {
        await deleteFile(profileImage);
        removed = true;
      } catch (error) {
        console.error('Failed to delete local profile image:', error.message);
      }
    }

    if (removed) {
      await member.update(
        { profileImage: null },
        { transaction }
      );
    }
  } catch (error) {
    console.error('EventRegistration cleanup error:', error);
  }
}

EventRegistration.addHook('afterDestroy', async (registration, options) => {
  if (registration?.memberId) {
    await cleanupMemberMedia(registration.memberId, options || {});
  }
});

EventRegistration.addHook('beforeBulkDestroy', async (options) => {
  if (!options || options.individualHooks || !options.where) {
    return;
  }

  const registrations = await EventRegistration.findAll({
    where: options.where,
    attributes: ['memberId']
  });

  options._targetMemberIds = [
    ...new Set(
      registrations
        .map((registration) => registration.memberId)
        .filter((memberId) => memberId != null)
    )
  ];
});

EventRegistration.addHook('afterBulkDestroy', async (options) => {
  if (!options || options.individualHooks) {
    return;
  }

  const memberIds = options._targetMemberIds;
  if (!memberIds || memberIds.length === 0) {
    return;
  }

  await Promise.all(
    memberIds.map((memberId) => cleanupMemberMedia(memberId, options || {}))
  );
});
