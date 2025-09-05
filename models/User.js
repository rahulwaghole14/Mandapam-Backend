const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true,
    maxlength: [50, 'Name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'sub-admin'],
    default: 'sub-admin'
  },
  district: {
    type: String,
    required: [true, 'Please add a district'],
    trim: true
  },
  state: {
    type: String,
    required: [true, 'Please add a state'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Please add a phone number'],
    match: [/^[0-9]{10}$/, 'Please add a valid 10-digit phone number']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  profileImage: {
    type: String,
    default: null
  },
  permissions: {
    vendors: {
      read: { type: Boolean, default: true },
      write: { type: Boolean, default: true },
      delete: { type: Boolean, default: false }
    },
    events: {
      read: { type: Boolean, default: true },
      write: { type: Boolean, default: true },
      delete: { type: Boolean, default: false }
    },
    bod: {
      read: { type: Boolean, default: true },
      write: { type: Boolean, default: true },
      delete: { type: Boolean, default: false }
    },
    members: {
      read: { type: Boolean, default: true },
      write: { type: Boolean, default: true },
      delete: { type: Boolean, default: false }
    },
    associations: {
      read: { type: Boolean, default: true },
      write: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    }
  }
}, {
  timestamps: true
});

// Set permissions based on role
userSchema.pre('save', function(next) {
  if (this.role === 'admin') {
    this.permissions = {
      vendors: { read: true, write: true, delete: true },
      events: { read: true, write: true, delete: true },
      bod: { read: true, write: true, delete: true },
      members: { read: true, write: true, delete: true },
      associations: { read: true, write: true, delete: true }
    };
  }
  next();
});

// Encrypt password using bcrypt
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// Check if user has permission for specific action
userSchema.methods.hasPermission = function(resource, action) {
  if (this.role === 'admin') return true;
  
  return this.permissions[resource] && this.permissions[resource][action];
};

// Get user permissions summary
userSchema.methods.getPermissionsSummary = function() {
  const summary = {};
  Object.keys(this.permissions).forEach(resource => {
    summary[resource] = {
      read: this.permissions[resource].read,
      write: this.permissions[resource].write,
      delete: this.permissions[resource].delete
    };
  });
  return summary;
};

module.exports = mongoose.model('User', userSchema);






