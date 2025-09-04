# 📱 Mobile App API Integration - Final Requirements

## Project Overview
- **Web App (React)**: ✅ Ready with APIs integrated
- **Mobile App (React Native)**: ✅ Static app ready, needs API integration
- **Backend**: Existing APIs for web frontend working perfectly

## 1. Mobile App Authentication Method
- **Login Method**: Mobile Number + OTP (6-digit)
- **OTP Service**: Twilio SMS (or specify alternative)
- **OTP Expiry**: 5 minutes (or specify duration)
- **Token**: JWT tokens for session management
- **No Password**: Members don't have passwords

## 2. Member Registration Process
- **Self-Registration**: Members can register themselves through mobile app
- **Required Fields**: 
  - Name
  - Mobile Number
  - Business Name
  - Business Type (sound, decorator, catering, generator, madap, light)
  - City
  - Pincode
  - Association Name
- **Optional Fields**: Email, Profile Image

## 3. Mobile App Features Confirmation
Please confirm which features you have in your static app:

- [ ] **Member Login** (Mobile + OTP)
- [ ] **Member Directory** (Browse other members)
- [ ] **Member Search** (Search by name/business type)
- [ ] **Member Profile View** (View other member details)
- [ ] **My Profile** (View/edit own profile)
- [ ] **Events List** (View upcoming events)
- [ ] **Event Details** (View specific event)
- [ ] **Association Info** (View association details)
- [ ] **Board of Directors** (View BOD members)
- [ ] **Profile Photo Upload** (Upload profile image)
- [ ] **Other features** (specify)

## 4. API Endpoints Required

### Authentication APIs
```
POST /api/mobile/send-otp          # Send OTP to mobile number
POST /api/mobile/verify-otp        # Verify OTP and login
POST /api/mobile/register          # Register new member
GET  /api/mobile/profile           # Get user profile
PUT  /api/mobile/profile           # Update user profile
POST /api/mobile/logout            # Logout user
```

### Member APIs
```
GET  /api/mobile/members           # Get all members (with pagination)
GET  /api/mobile/members/:id       # Get specific member details
GET  /api/mobile/members/search    # Search members by name/business
GET  /api/mobile/members/filter    # Filter members by business type/city
```

### Event APIs
```
GET  /api/mobile/events            # Get all events
GET  /api/mobile/events/:id        # Get specific event details
GET  /api/mobile/events/upcoming   # Get upcoming events
GET  /api/mobile/events/search     # Search events by title/type
```

### Association APIs
```
GET  /api/mobile/associations      # Get all associations
GET  /api/mobile/associations/:id  # Get specific association details
```

### Board of Directors APIs
```
GET  /api/mobile/bod               # Get all BOD members
GET  /api/mobile/bod/:id           # Get specific BOD member details
```

### File Upload APIs
```
POST /api/mobile/upload/profile-image # Upload profile photo
DELETE /api/mobile/upload/:filename   # Delete uploaded file
```

## 5. Technical Requirements

### SMS Service
- **Provider**: Twilio (or specify alternative)
- **Setup**: Need Twilio Account SID, Auth Token, Phone Number
- **Fallback**: WhatsApp API (optional)

### File Upload
- **Types**: Images only (jpg, png, gif, webp)
- **Max Size**: 5MB
- **Storage**: Local server storage (uploads folder)

### Authentication
- **Token Type**: JWT
- **Expiry**: 24 hours
- **Storage**: Mobile app secure storage (Keychain/Keystore)

## 6. Data Models

### Member Profile (Mobile)
```javascript
{
  "_id": "string",
  "name": "string (required)",
  "businessName": "string (required)",
  "businessType": "enum: sound|decorator|catering|generator|madap|light",
  "phone": "string (required, 10 digits)",
  "city": "string (required)",
  "pincode": "string (required, 6 digits)",
  "state": "string (default: Maharashtra)",
  "associationName": "string (required)",
  "profileImage": "string (optional)",
  "email": "string (optional)",
  "isActive": "boolean (default: true)",
  "isMobileVerified": "boolean (default: false)",
  "paymentStatus": "enum: Paid|Pending|Overdue|Not Required",
  "createdAt": "date",
  "updatedAt": "date"
}
```

### OTP Model
```javascript
{
  "_id": "string",
  "mobileNumber": "string (required, 10 digits)",
  "otp": "string (required, 6 digits)",
  "expiresAt": "date (5 minutes from creation)",
  "attempts": "number (default: 0, max: 3)",
  "isUsed": "boolean (default: false)",
  "purpose": "enum: login|registration|password_reset",
  "createdAt": "date"
}
```

## 7. API Response Format

### Success Response
```javascript
{
  "success": true,
  "message": "Success message",
  "data": { /* response data */ },
  "pagination": { /* if applicable */ }
}
```

### Error Response
```javascript
{
  "success": false,
  "message": "Error message",
  "errors": [ /* validation errors if any */ ]
}
```

## 8. New Files to Create

### Routes
```
routes/
├── mobileAuthRoutes.js      # Mobile authentication endpoints
├── mobileMemberRoutes.js    # Mobile member management
├── mobileEventRoutes.js     # Mobile event features
├── mobileAssociationRoutes.js # Mobile association features
├── mobileBODRoutes.js       # Mobile BOD features
└── mobileUploadRoutes.js    # Mobile file upload
```

### Models
```
models/
└── OTP.js                   # OTP management model
```

### Middleware
```
middleware/
└── mobileAuthMiddleware.js  # Mobile-specific authentication
```

## 9. Environment Variables to Add

```bash
# SMS Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890

# OTP Configuration
OTP_EXPIRY_MINUTES=5
OTP_MAX_ATTEMPTS=3
OTP_RATE_LIMIT_MINUTES=15
```

## 10. Implementation Priority

### Phase 1: Core Authentication
1. Create OTP model and service
2. Add mobile authentication routes
3. Update Member model for mobile verification
4. Test OTP flow

### Phase 2: Basic Features
1. Member profile management
2. Member directory browsing
3. Event viewing
4. File upload functionality

### Phase 3: Advanced Features
1. Search and filtering
2. Association and BOD information
3. Error handling and validation
4. Performance optimization

## 11. Questions to Confirm

### A. SMS Service
- [ ] Do you have Twilio account/credentials?
- [ ] Or should I set up a different SMS service?
- [ ] Should I include WhatsApp API as well?

### B. Member Features
- [ ] What member information do you display in your mobile app?
- [ ] What fields can members edit in their profile?
- [ ] Do you need member contact functionality?

### C. Event Features
- [ ] Do you need RSVP functionality for events?
- [ ] Should members be able to create events or only view them?
- [ ] Do you need event notifications?

### D. File Upload
- [ ] Do you have image upload in your mobile app?
- [ ] What's the maximum file size you want to support?
- [ ] Do you need image compression?

## 12. Ready to Proceed?

If you confirm the above requirements, I can start building the mobile APIs immediately with these assumptions:

✅ **Authentication**: Mobile number + OTP (6-digit, 5-minute expiry)
✅ **SMS Service**: Twilio (with setup instructions)
✅ **Member Registration**: Self-registration through mobile app
✅ **Core Features**: Member directory, events, profile management
✅ **File Upload**: Profile photo upload (5MB limit)

## 13. Key Benefits

- **No Impact**: Existing web APIs remain completely untouched
- **Separate System**: Mobile APIs work independently
- **Scalable**: Easy to add new mobile features
- **Secure**: JWT-based authentication with OTP verification
- **Flexible**: Easy to modify without affecting web frontend

---

**Next Steps**: Confirm the requirements above and I'll start building the mobile APIs for your React Native app!
