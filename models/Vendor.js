const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Vendor = sequelize.define('Vendor', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  businessName: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 200]
    }
  },
  businessType: {
    type: DataTypes.ENUM('catering', 'sound', 'light', 'decorator', 'photography', 'videography', 'transport', 'other'),
    allowNull: false
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  state: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  pincode: {
    type: DataTypes.STRING(10),
    allowNull: true,
    validate: {
      is: /^[0-9]{6}$/
    }
  },
  phone: {
    type: DataTypes.STRING(15),
    allowNull: false,
    unique: true,
    validate: {
      is: /^[0-9+\-\s()]+$/
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  gstNumber: {
    type: DataTypes.STRING(15),
    allowNull: true,
    validate: {
      is: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
    }
  },
  profileImage: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  businessImages: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    defaultValue: []
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  experience: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    allowNull: true,
    defaultValue: 0.0,
    validate: {
      min: 0.0,
      max: 5.0
    }
  },
  totalBookings: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  status: {
    type: DataTypes.ENUM('Active', 'Pending', 'Inactive'),
    allowNull: false,
    defaultValue: 'Pending'
  },
  associationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'associations',
      key: 'id'
    }
  }
}, {
  tableName: 'vendors',
  timestamps: true
});

module.exports = Vendor;