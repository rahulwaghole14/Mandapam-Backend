const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add vendor name'],
    trim: true,
    maxlength: [100, 'Name cannot be more than 100 characters']
  },
  businessName: {
    type: String,
    required: [true, 'Please add business name'],
    trim: true,
    maxlength: [150, 'Business name cannot be more than 150 characters']
  },
  category: {
    type: String,
    required: [true, 'Please add vendor category'],
    enum: [
      'Catering',
      'Decoration',
      'Photography',
      'Videography',
      'Music',
      'Transport',
      'Venue',
      'Makeup',
      'Jewelry',
      'Clothing',
      'Other'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Please add phone number'],
    match: [/^[0-9]{10}$/, 'Please add a valid 10-digit phone number']
  },
  whatsapp: {
    type: String,
    match: [/^[0-9]{10}$/, 'Please add a valid 10-digit WhatsApp number']
  },
  email: {
    type: String,
    required: [true, 'Please add email'],
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  address: {
    street: {
      type: String,
      required: [true, 'Please add street address'],
      trim: true
    },
    city: {
      type: String,
      required: [true, 'Please add city'],
      trim: true
    },
    district: {
      type: String,
      required: [true, 'Please add district'],
      trim: true
    },
    state: {
      type: String,
      required: [true, 'Please add state'],
      trim: true
    },
    pincode: {
      type: String,
      required: [true, 'Please add pincode'],
      match: [/^[0-9]{6}$/, 'Please add a valid 6-digit pincode']
    }
  },
  dateOfJoining: {
    type: Date,
    required: [true, 'Please add date of joining'],
    default: Date.now
  },
  membershipExpiry: {
    type: Date,
    required: [true, 'Please add membership expiry date']
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive', 'Pending', 'Suspended'],
    default: 'Active'
  },
  businessLogo: {
    type: String,
    default: null
  },
  businessImages: [{
    type: String
  }],
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  services: [{
    type: String,
    trim: true
  }],
  pricing: {
    startingPrice: {
      type: Number,
      min: [0, 'Starting price cannot be negative']
    },
    currency: {
      type: String,
      default: 'INR'
    }
  },
  rating: {
    type: Number,
    min: [0, 'Rating cannot be negative'],
    max: [5, 'Rating cannot be more than 5'],
    default: 0
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot be more than 1000 characters']
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

// Index for better search performance
vendorSchema.index({ 
  name: 'text', 
  businessName: 'text', 
  'address.city': 'text', 
  'address.district': 'text',
  category: 1,
  status: 1
});

// Virtual for membership status
vendorSchema.virtual('membershipStatus').get(function() {
  const now = new Date();
  const expiry = new Date(this.membershipExpiry);
  
  if (expiry < now) {
    return 'Expired';
  } else if (expiry - now < 30 * 24 * 60 * 60 * 1000) { // 30 days
    return 'Expiring Soon';
  } else {
    return 'Active';
  }
});

// Virtual for days until expiry
vendorSchema.virtual('daysUntilExpiry').get(function() {
  const now = new Date();
  const expiry = new Date(this.membershipExpiry);
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
});

// Method to check if membership is expiring soon
vendorSchema.methods.isExpiringSoon = function(days = 30) {
  const now = new Date();
  const expiry = new Date(this.membershipExpiry);
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays <= days && diffDays > 0;
};

// Method to check if membership is expired
vendorSchema.methods.isExpired = function() {
  const now = new Date();
  const expiry = new Date(this.membershipExpiry);
  return expiry < now;
};

// Ensure virtual fields are serialized
vendorSchema.set('toJSON', { virtuals: true });
vendorSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Vendor', vendorSchema);

