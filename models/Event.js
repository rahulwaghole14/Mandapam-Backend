const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add event title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add event description'],
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  type: {
    type: String,
    required: [true, 'Please add event type'],
    enum: [
      'Meeting',
      'Workshop',
      'Seminar',
      'Conference',
      'Celebration',
      'Training',
      'Announcement',
      'Other'
    ]
  },
  date: {
    type: Date,
    required: [true, 'Please add event date']
  },
  startTime: {
    type: String,
    required: [true, 'Please add start time'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please add valid time in HH:MM format']
  },
  endTime: {
    type: String,
    required: [true, 'Please add end time'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Please add valid time in HH:MM format']
  },
  location: {
    address: {
      type: String,
      required: [true, 'Please add event address'],
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
  organizer: {
    type: String,
    required: [true, 'Please add organizer name'],
    trim: true
  },
  contactPerson: {
    name: {
      type: String,
      required: [true, 'Please add contact person name'],
      trim: true
    },
    phone: {
      type: String,
      required: [true, 'Please add contact phone'],
      match: [/^[0-9]{10}$/, 'Please add a valid 10-digit phone number']
    },
    email: {
      type: String,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email'
      ]
    }
  },
  status: {
    type: String,
    enum: ['Upcoming', 'Ongoing', 'Completed', 'Cancelled', 'Postponed'],
    default: 'Upcoming'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  targetAudience: [{
    type: String,
    enum: ['All Members', 'Vendors', 'BOD', 'Sub-Admins', 'Admin Only']
  }],
  maxAttendees: {
    type: Number,
    min: [1, 'Maximum attendees must be at least 1']
  },
  currentAttendees: {
    type: Number,
    default: 0
  },
  registrationRequired: {
    type: Boolean,
    default: false
  },
  registrationDeadline: {
    type: Date
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [{
    type: String,
    trim: true
  }],
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
eventSchema.index({ 
  title: 'text', 
  description: 'text',
  'location.city': 'text',
  'location.district': 'text',
  type: 1,
  status: 1,
  date: 1
});

// Virtual for event status based on date
eventSchema.virtual('computedStatus').get(function() {
  const now = new Date();
  const eventDate = new Date(this.date);
  
  if (this.status === 'Cancelled' || this.status === 'Postponed') {
    return this.status;
  }
  
  if (eventDate < now) {
    return 'Completed';
  } else if (eventDate - now < 24 * 60 * 60 * 1000) { // 24 hours
    return 'Upcoming';
  } else {
    return 'Upcoming';
  }
});

// Virtual for days until event
eventSchema.virtual('daysUntilEvent').get(function() {
  const now = new Date();
  const eventDate = new Date(this.date);
  const diffTime = eventDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
});

// Virtual for event duration
eventSchema.virtual('duration').get(function() {
  if (!this.startTime || !this.endTime) return null;
  
  const start = new Date(`2000-01-01T${this.startTime}:00`);
  const end = new Date(`2000-01-01T${this.endTime}:00`);
  const diffMs = end - start;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m`;
  } else {
    return `${diffMinutes}m`;
  }
});

// Method to check if event is happening today
eventSchema.methods.isToday = function() {
  const now = new Date();
  const eventDate = new Date(this.date);
  return now.toDateString() === eventDate.toDateString();
};

// Method to check if event is happening this week
eventSchema.methods.isThisWeek = function() {
  const now = new Date();
  const eventDate = new Date(this.date);
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  return eventDate - now <= oneWeek && eventDate - now >= 0;
};

// Method to check if registration is still open
eventSchema.methods.isRegistrationOpen = function() {
  if (!this.registrationRequired || !this.registrationDeadline) {
    return false;
  }
  
  const now = new Date();
  const deadline = new Date(this.registrationDeadline);
  return deadline > now;
};

// Ensure virtual fields are serialized
eventSchema.set('toJSON', { virtuals: true });
eventSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Event', eventSchema);






