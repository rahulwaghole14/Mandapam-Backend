const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add member name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  businessName: {
    type: String,
    required: [true, 'Please add business name'],
    trim: true,
    maxlength: [200, 'Business name cannot be more than 200 characters']
  },
  phone: {
    type: String,
    required: [true, 'Please add phone number'],
    match: [/^[0-9]{10}$/, 'Please add a valid 10-digit phone number']
  },
  state: {
    type: String,
    required: [true, 'State is required'],
    default: 'Maharashtra',
    trim: true
  },
  businessType: {
    type: String,
    required: [true, 'Please select business type'],
    enum: ['sound', 'decorator', 'catering', 'generator', 'madap', 'light'],
    trim: true
  },
  city: {
    type: String,
    required: [true, 'City is required'],
    trim: true
  },
  pincode: {
    type: String,
    required: [true, 'Pincode is required'],
    match: [/^[0-9]{6}$/, 'Please add a valid 6-digit pincode'],
    trim: true
  },
  associationName: {
    type: String,
    required: [true, 'Please select association name'],
    trim: true
  },
  profileImage: {
    type: String,
    default: null
  },
  email: {
    type: String,
    required: false,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please add a valid email']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isMobileVerified: {
    type: Boolean,
    default: false
  },
  mobileVerifiedAt: {
    type: Date
  },
  lastOTPRequest: {
    type: Date
  },
  otpAttempts: {
    type: Number,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Pending', 'Overdue', 'Not Required'],
    default: 'Pending',
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Allow null for self-registered members
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better query performance
memberSchema.index({ name: 'text', businessName: 'text', phone: 'text' });
memberSchema.index({ businessType: 1, city: 1, state: 1 });
memberSchema.index({ associationName: 1, city: 1 });

// Ensure virtual fields are serialized
memberSchema.set('toJSON', { virtuals: true });
memberSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Member', memberSchema);
