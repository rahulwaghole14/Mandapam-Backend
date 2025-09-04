const mongoose = require('mongoose');

const bodSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add BOD member name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  designation: {
    type: String,
    required: [true, 'Please add designation'],
    enum: [
      'President',
      'Vice President', 
      'Secretary',
      'Joint Secretary',
      'Treasurer',
      'Joint Treasurer',
      'Executive Member',
      'Member'
    ]
  },
  contactNumber: {
    type: String,
    required: [true, 'Please add contact number'],
    match: [/^[0-9]{10}$/, 'Please add a valid 10-digit contact number']
  },
  email: {
    type: String,
    required: [true, 'Please add email'],
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  profileImage: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  dateOfJoining: {
    type: Date,
    default: Date.now
  },
  dateOfResignation: {
    type: Date,
    default: null
  },
  address: {
    street: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    district: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    pincode: {
      type: String,
      match: [/^[0-9]{6}$/, 'Please add a valid 6-digit pincode']
    }
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot be more than 500 characters']
  },
  socialLinks: {
    linkedin: String,
    twitter: String,
    facebook: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Create text index for search functionality
bodSchema.index({ name: 'text', designation: 'text', email: 'text' });

module.exports = mongoose.model('BOD', bodSchema);





