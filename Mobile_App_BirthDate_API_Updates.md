# 📱 Mobile App API Updates - Birth Date Field Integration

## 🎯 **Overview**
This document contains the updated API endpoints for the Mandap Association Platform with the newly added **birth date** field for member registration and profile management.

## 🔗 **Base URL**
- **Development**: `http://localhost:5000`
- **Production**: `https://your-domain.com`

## 📋 **Updated API Endpoints**

### **1. Authentication APIs**

#### **Send OTP**
```http
POST /api/mobile/send-otp
Content-Type: application/json

{
  "mobileNumber": "9876543210"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully to your mobile number",
  "otp": "123456"
}
```

#### **Verify OTP & Login**
```http
POST /api/mobile/verify-otp
Content-Type: application/json

{
  "mobileNumber": "9876543210",
  "otp": "123456"
}
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
    "state": "Maharashtra",
    "pincode": "400001",
    "associationName": "Mumbai Mandap Association",
    "profileImage": "profile-image-url",
    "email": "john@example.com",
    "birthDate": "1990-05-15T00:00:00.000Z",
    "isMobileVerified": true,
    "paymentStatus": "Paid",
    "isActive": true
  }
}
```

### **2. Member Registration & Profile APIs**

#### **Register New Member** ⭐ **UPDATED**
```http
POST /api/mobile/register
Content-Type: application/json

{
  "name": "John Doe",
  "businessName": "Doe's Sound Systems",
  "businessType": "sound",
  "phone": "9876543210",
  "city": "Mumbai",
  "pincode": "400001",
  "associationName": "Mumbai Mandap Association",
  "state": "Maharashtra",
  "email": "john@example.com",
  "birthDate": "1990-05-15"
}
```

**Field Details:**
- `birthDate`: **Optional** - ISO8601 date format (YYYY-MM-DD)
- **Validation**: Member must be at least 18 years old
- **Example**: `"1990-05-15"` or `null` (if not provided)

**Response:**
```json
{
  "success": true,
  "message": "Member registered successfully. Please login with your mobile number.",
  "member": {
    "_id": "member_id",
    "name": "John Doe",
    "businessName": "Doe's Sound Systems",
    "businessType": "sound",
    "phone": "9876543210",
    "city": "Mumbai",
    "associationName": "Mumbai Mandap Association"
  }
}
```

#### **Get User Profile**
```http
GET /api/mobile/profile
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "member": {
    "_id": "member_id",
    "name": "John Doe",
    "businessName": "Doe's Sound Systems",
    "businessType": "sound",
    "phone": "9876543210",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "associationName": "Mumbai Mandap Association",
    "profileImage": "profile-image-url",
    "email": "john@example.com",
    "birthDate": "1990-05-15T00:00:00.000Z",
    "isMobileVerified": true,
    "paymentStatus": "Paid",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### **Update User Profile** ⭐ **UPDATED**
```http
PUT /api/mobile/profile
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "John Doe Updated",
  "businessName": "Doe's Premium Sound Systems",
  "city": "Mumbai",
  "birthDate": "1990-05-15",
  "email": "john.updated@example.com"
}
```

**Field Details:**
- `birthDate`: **Optional** - Can be updated or removed (set to `null`)
- **Validation**: Must be at least 18 years old if provided
- **Format**: ISO8601 date (YYYY-MM-DD)

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "member": {
    "_id": "member_id",
    "name": "John Doe Updated",
    "businessName": "Doe's Premium Sound Systems",
    "businessType": "sound",
    "phone": "9876543210",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "associationName": "Mumbai Mandap Association",
    "profileImage": "profile-image-url",
    "email": "john.updated@example.com",
    "birthDate": "1990-05-15T00:00:00.000Z",
    "isMobileVerified": true,
    "paymentStatus": "Paid",
    "isActive": true,
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

### **3. Member Directory APIs**

#### **Get All Members**
```http
GET /api/mobile/members?page=1&limit=20&businessType=sound&city=Mumbai
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "count": 20,
  "total": 150,
  "page": 1,
  "totalPages": 8,
  "hasNextPage": true,
  "hasPrevPage": false,
  "members": [
    {
      "_id": "member_id_1",
      "name": "John Doe",
      "businessName": "Doe's Sound Systems",
      "businessType": "sound",
      "phone": "9876543210",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "associationName": "Mumbai Mandap Association",
      "profileImage": "profile-image-url",
      "email": "john@example.com",
      "birthDate": "1990-05-15T00:00:00.000Z",
      "isActive": true
    }
  ]
}
```

#### **Get Member Details**
```http
GET /api/mobile/members/:id
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "member": {
    "_id": "member_id",
    "name": "John Doe",
    "businessName": "Doe's Sound Systems",
    "businessType": "sound",
    "phone": "9876543210",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "associationName": "Mumbai Mandap Association",
    "profileImage": "profile-image-url",
    "email": "john@example.com",
    "birthDate": "1990-05-15T00:00:00.000Z",
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## 🔧 **Birth Date Field Specifications**

### **Field Details**
- **Field Name**: `birthDate`
- **Type**: `Date` (ISO8601 string in JSON)
- **Required**: `false` (Optional)
- **Format**: `YYYY-MM-DD` (e.g., `"1990-05-15"`)

### **Validation Rules**
1. **Date Format**: Must be valid ISO8601 date
2. **Age Validation**: Member must be at least 18 years old
3. **Optional**: Can be `null`, `undefined`, or omitted
4. **Error Message**: `"Member must be at least 18 years old"`

### **Error Responses**
```json
{
  "success": false,
  "errors": [
    {
      "msg": "Birth date must be a valid date",
      "param": "birthDate",
      "location": "body"
    }
  ]
}
```

```json
{
  "success": false,
  "message": "Member must be at least 18 years old"
}
```

## 📱 **Mobile App Integration Notes**

### **Date Picker Implementation**
- Use date picker component for birth date selection
- Set maximum date to 18 years ago from current date
- Format: `YYYY-MM-DD` when sending to API
- Display: Format according to app's locale

### **Form Validation**
- Client-side validation: Check if user is at least 18 years old
- Server-side validation: API will validate and return appropriate errors
- Optional field: Don't require birth date for registration

### **Data Handling**
- Store birth date as ISO string in local storage/database
- Parse date for display in UI components
- Handle `null` values gracefully in UI

## 🧪 **Testing Examples**

### **Valid Birth Date**
```json
{
  "birthDate": "1990-05-15"
}
```

### **Invalid Birth Date (Too Young)**
```json
{
  "birthDate": "2010-05-15"
}
```
**Error**: `"Member must be at least 18 years old"`

### **Invalid Date Format**
```json
{
  "birthDate": "15-05-1990"
}
```
**Error**: `"Birth date must be a valid date"`

### **No Birth Date (Valid)**
```json
{
  "name": "John Doe",
  "businessName": "Doe's Sound Systems"
  // birthDate omitted - this is valid
}
```

## 🔐 **Authentication**
- All protected endpoints require JWT token in Authorization header
- Token format: `Bearer <jwt_token>`
- Token expires after 24 hours (configurable)

## 📞 **Support**
For any questions or issues with the API integration, please contact the backend development team.

---
**Last Updated**: September 5, 2025  
**Version**: 1.1.0 (Birth Date Integration)
