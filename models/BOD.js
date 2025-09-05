const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const BOD = sequelize.define('BOD', {
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
  position: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'position',
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(15),
    allowNull: true,
    validate: {
      is: /^[0-9+\-\s()]+$/
    }
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
  profileImage: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'profile_image'
  },
  bio: {
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
  termStart: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'term_start',
    validate: {
      isDate: true
    }
  },
  termEnd: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'term_end',
    validate: {
      isDate: true
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  associationId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'association_id',
    references: {
      model: 'associations',
      key: 'id'
    }
  }
}, {
  tableName: 'board_of_directors',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  validate: {
    // Custom validation for term dates
    termValidation() {
      if (this.termEnd && this.termStart) {
        if (new Date(this.termEnd) < new Date(this.termStart)) {
          throw new Error('Term end date must be after term start date');
        }
      }
    }
  }
});

module.exports = BOD;