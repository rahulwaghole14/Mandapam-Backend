const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Event = sequelize.define('Event', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 200]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('Meeting', 'Workshop', 'Seminar', 'Celebration', 'Other'),
    allowNull: false
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'start_date',
    validate: {
      isDate: true
    }
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'end_date',
    validate: {
      isDate: true
    }
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true
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
  contactPerson: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'contact_person'
  },
  contactPhone: {
    type: DataTypes.STRING(15),
    allowNull: true,
    field: 'contact_phone',
    validate: {
      is: /^[0-9+\-\s()]+$/
    }
  },
  contactEmail: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'contact_email',
    validate: {
      isEmail: true
    }
  },
  maxAttendees: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'max_attendees',
    validate: {
      min: 1
    }
  },
  currentAttendees: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'current_attendees'
  },
  registrationFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    field: 'registration_fee',
    validate: {
      min: 0
    }
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_active'
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    field: 'is_public'
  },
  image: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false,
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
  },
  district: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('Upcoming', 'Ongoing', 'Completed', 'Cancelled', 'Postponed'),
    allowNull: false,
    defaultValue: 'Upcoming'
  },
  priority: {
    type: DataTypes.ENUM('Low', 'Medium', 'High', 'Urgent'),
    allowNull: true,
    defaultValue: 'Medium'
  }
}, {
  tableName: 'events',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  validate: {
    // Custom validation for date range
    dateValidation() {
      if (this.endDate && this.startDate) {
        if (new Date(this.endDate) < new Date(this.startDate)) {
          throw new Error('End date must be after start date');
        }
      }
    },
    // Custom validation for attendees
    attendeesValidation() {
      if (this.maxAttendees && this.currentAttendees > this.maxAttendees) {
        throw new Error('Current attendees cannot exceed maximum attendees');
      }
    }
  }
});

// Define associations
Event.associate = function(models) {
  // Event belongs to User (createdBy)
  Event.belongsTo(models.User, {
    foreignKey: 'createdBy',
    as: 'createdByUser'
  });
  
  // Event belongs to User (updatedBy)
  Event.belongsTo(models.User, {
    foreignKey: 'updatedBy',
    as: 'updatedByUser'
  });
  
};

module.exports = Event;















