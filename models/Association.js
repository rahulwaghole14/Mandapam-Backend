const mongoose = require('mongoose');

const associationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Association name is required'],
    trim: true,
    maxlength: [100, 'Association name cannot exceed 100 characters']
  },
  address: {
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: [50, 'City name cannot exceed 50 characters']
    },
    district: {
      type: String,
      required: [true, 'District is required'],
      trim: true,
      maxlength: [50, 'District name cannot exceed 50 characters']
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      maxlength: [50, 'State name cannot exceed 50 characters']
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
      match: [/^[0-9]{6}$/, 'Please enter a valid 6-digit pincode']
    }
  },
  establishedDate: {
    type: Date,
    required: [true, 'Established date is required']
  },
  memberCount: {
    type: Number,
    default: 0,
    min: [0, 'Member count cannot be negative']
  },
  status: {
    type: String,
    enum: ['Active', 'Pending', 'Inactive'],
    default: 'Active'
  },
  contactPerson: {
    type: String,
    trim: true,
    maxlength: [100, 'Contact person name cannot exceed 100 characters']
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[0-9+\-\s()]{10,15}$/, 'Please enter a valid phone number']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email address']
  },
  website: {
    type: String,
    trim: true,
    match: [/^https?:\/\/.+/, 'Please enter a valid website URL starting with http:// or https://']
  },
  socialLinks: {
    linkedin: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Please enter a valid LinkedIn URL starting with http:// or https://']
    },
    twitter: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Please enter a valid Twitter URL starting with http:// or https://']
    },
    facebook: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Please enter a valid Facebook URL starting with http:// or https://']
    }
  },
  logo: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for better search performance
associationSchema.index({ name: 'text', 'address.city': 1, 'address.state': 1, status: 1 });

module.exports = mongoose.model('Association', associationSchema);
