const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Member = sequelize.define('Member', {
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
    field: 'business_name',
    validate: {
      notEmpty: true,
      len: [2, 200]
    }
  },
  businessType: {
    type: DataTypes.ENUM('catering', 'sound', 'mandap', 'light', 'decorator', 'photography', 'videography', 'transport', 'other'),
    allowNull: false,
    field: 'business_type'
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
    field: 'gst_number',
    validate: {
      is: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
    }
  },
  profileImage: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'profile_image'
  },
  businessImages: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: true,
    defaultValue: [],
    field: 'business_images'
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
    defaultValue: 0,
    field: 'total_bookings'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_verified'
  },
  birthDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'birth_date',
    validate: {
      isDate: true,
      isAfter: '1900-01-01',
      isBefore: new Date().toISOString().split('T')[0]
    }
  },
  associationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'association_id',
    references: {
      model: 'associations',
      key: 'id'
    }
  },
  associationName: {
    type: DataTypes.STRING(200),
    allowNull: true,
    field: 'association_name'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'created_by',
    references: {
      model: 'users',
      key: 'id'
    }
  },
  updatedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'updated_by',
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'members',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  validate: {
    // Custom validation for birth date (must be at least 18 years old)
    birthDateValidation() {
      if (this.birthDate) {
        const today = new Date();
        const birthDate = new Date(this.birthDate);
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          if (age - 1 < 18) {
            throw new Error('Member must be at least 18 years old');
          }
        } else {
          if (age < 18) {
            throw new Error('Member must be at least 18 years old');
          }
        }
      }
    }
  }
});

module.exports = Member;