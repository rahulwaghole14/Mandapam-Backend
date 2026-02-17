# 📱 Mobile API Testing Guide

## 🎯 **API Implementation Complete!**

All mobile APIs have been successfully implemented and are ready for testing. Here's a comprehensive guide to test your mobile app integration.

## 🔗 **Base URL**
```
Development: http://localhost:5000
Production: https://your-domain.com
```

## 📋 **Available Mobile API Endpoints**

### 1. **Authentication APIs**
```
POST /api/mobile/send-otp          # Send OTP to mobile number
POST /api/mobile/verify-otp        # Verify OTP and login
POST /api/mobile/register          # Register new member
POST /api/mobile/logout            # Logout user
GET  /api/mobile/profile           # Get user profile (protected)
PUT  /api/mobile/profile           # Update user profile (protected)
```

### 2. **Member APIs**
```
GET  /api/mobile/members           # Get all members with pagination
GET  /api/mobile/members/:id       # Get specific member details
GET  /api/mobile/members/search    # Search members
GET  /api/mobile/members/filter    # Filter members by criteria
```

### 3. **Event APIs**
```
GET  /api/mobile/events            # Get all events
GET  /api/mobile/events/:id        # Get specific event details
GET  /api/mobile/events/upcoming   # Get upcoming events
GET  /api/mobile/events/search     # Search events
GET  /api/mobile/events/stats      # Get event statistics
```

### 4. **Association APIs**
```
GET  /api/mobile/associations      # Get all associations
GET  /api/mobile/associations/:id  # Get specific association details
GET  /api/mobile/associations/search # Search associations
GET  /api/mobile/associations/stats # Get association statistics
```

### 5. **Board of Directors APIs**
```
GET  /api/mobile/bod               # Get board of directors
GET  /api/mobile/bod/:id           # Get specific BOD member details
GET  /api/mobile/bod/designation/:designation # Get BOD by designation
```

### 6. **File Upload APIs**
```
POST /api/mobile/upload/profile-image # Upload profile photo
POST /api/mobile/upload/images        # Upload multiple images
GET  /api/mobile/upload/:filename     # Get file info
DELETE /api/mobile/upload/:filename   # Delete uploaded file
```

## 🧪 **Testing Examples**

### **1. Send OTP**
```bash
curl -X POST http://localhost:5000/api/mobile/send-otp \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber": "9876543210"}'
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully to your mobile number",
  "otp": "123456"
}
```

### **2. Verify OTP & Login**
```bash
curl -X POST http://localhost:5000/api/mobile/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber": "9876543210", "otp": "123456"}'
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "member": {
    "_id": "member_id",
    "name": "John Doe",
    "businessName": "Doe's Sound Systems",
    "businessType": "sound",
    "phone": "9876543210",
    "city": "Mumbai",
    "isMobileVerified": true
  }
}
```

### **3. Get Members (Protected)**
```bash
curl -X GET http://localhost:5000/api/mobile/members \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### **4. Upload Profile Image**
```bash
curl -X POST http://localhost:5000/api/mobile/upload/profile-image \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@/path/to/image.jpg"
```

## 🔐 **Authentication Flow**

### **Step 1: Send OTP**
1. User enters mobile number
2. Call `POST /api/mobile/send-otp`
3. Server generates OTP (default: "123456")
4. OTP is returned in response (for development)

### **Step 2: Verify OTP**
1. User enters OTP
2. Call `POST /api/mobile/verify-otp`
3. Server verifies OTP
4. Returns JWT token and member data

### **Step 3: Use Protected APIs**
1. Include JWT token in Authorization header
2. Format: `Authorization: Bearer <token>`
3. Token expires in 24 hours

## 📱 **Mobile App Integration**

### **API Service Setup**
```javascript
// API Configuration
const API_BASE_URL = 'http://localhost:5000';

// API Service
class APIService {
  static async sendOTP(mobileNumber) {
    const response = await fetch(`${API_BASE_URL}/api/mobile/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber })
    });
    return response.json();
  }

  static async verifyOTP(mobileNumber, otp) {
    const response = await fetch(`${API_BASE_URL}/api/mobile/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber, otp })
    });
    return response.json();
  }

  static async getMembers(token) {
    const response = await fetch(`${API_BASE_URL}/api/mobile/members`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }
}
```

### **Authentication State Management**
```javascript
// Store token securely
const storeToken = async (token) => {
  await AsyncStorage.setItem('auth_token', token);
};

// Get token
const getToken = async () => {
  return await AsyncStorage.getItem('auth_token');
};

// Remove token on logout
const removeToken = async () => {
  await AsyncStorage.removeItem('auth_token');
};
```

## 🎯 **Key Features Implemented**

### ✅ **Authentication System**
- OTP-based login with default OTP "123456"
- JWT token generation and validation
- Mobile-specific authentication middleware
- Secure token storage recommendations

### ✅ **Member Management**
- Member registration and profile management
- Member directory with search and filtering
- Pagination support for large datasets
- Profile image upload functionality

### ✅ **Event Management**
- Event listing with filtering and search
- Upcoming events endpoint
- Event statistics and analytics
- Date range filtering

### ✅ **Association & BOD**
- Association information and search
- Board of Directors directory
- BOD member details and filtering
- Association statistics

### ✅ **File Upload**
- Profile image upload (5MB limit)
- Multiple image upload support
- File management (view, delete)
- Secure file storage

## 🔧 **Development Features**

### **Default OTP System**
- OTP: "123456" (for all mobile numbers)
- 5-minute expiry time
- Rate limiting (3 requests per 15 minutes)
- Easy testing without SMS service

### **Error Handling**
- Comprehensive error responses
- Validation error details
- Rate limiting messages
- File upload error handling

### **Security Features**
- JWT token validation
- Mobile-specific authentication
- File type validation
- Input sanitization

## 🚀 **Production Setup**

### **SMS Service Integration**
To enable real SMS sending, update the `sendOTP` function in `routes/mobileAuthRoutes.js`:

```javascript
const sendOTP = async (mobileNumber, otp) => {
  // Replace with actual SMS service (Twilio, AWS SNS, etc.)
  const twilio = require('twilio');
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  
  await client.messages.create({
    body: `Your OTP is: ${otp}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: `+91${mobileNumber}`
  });
};
```

### **Environment Variables**
Add to your `.env` file:
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

## 📊 **API Documentation**

Visit `http://localhost:5000/api` to see the complete API documentation including all mobile endpoints.

## ✅ **Testing Checklist**

- [ ] Server starts without errors
- [ ] OTP sending works (returns "123456")
- [ ] OTP verification works
- [ ] JWT token generation works
- [ ] Protected endpoints require authentication
- [ ] Member registration works
- [ ] Member directory loads
- [ ] Event listing works
- [ ] File upload works
- [ ] Search and filtering work
- [ ] Pagination works

## 🎉 **Ready for Mobile App Integration!**

Your mobile APIs are now ready for integration with your React Native app. The APIs are completely separate from your existing web frontend APIs, so there's no risk of breaking your current web application.

**Next Steps:**
1. Test the APIs using the examples above
2. Integrate with your React Native app
3. Set up SMS service for production
4. Deploy to production server

**Happy Coding! 🚀**
