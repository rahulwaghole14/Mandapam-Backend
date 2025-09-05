# 🌐 Web App API Updates - Birth Date Field Integration

## 🎯 **Overview**
This document contains the updated API endpoints for the Mandap Association Platform web application with the newly added **birth date** field for member management and administration.

## 🔗 **Base URL**
- **Development**: `http://localhost:5000`
- **Production**: `https://your-domain.com`

## 🔐 **Authentication**
- **Method**: JWT Token Authentication
- **Header**: `Authorization: Bearer <jwt_token>`
- **Admin Access**: Most endpoints require admin privileges
- **Token Expiry**: 24 hours (configurable)

## 📋 **Updated API Endpoints**

### **1. Member Management APIs (Admin)**

#### **Create New Member** ⭐ **UPDATED**
```http
POST /api/members
Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "name": "John Doe",
  "businessName": "Doe's Sound Systems",
  "phone": "9876543210",
  "state": "Maharashtra",
  "businessType": "sound",
  "city": "Mumbai",
  "pincode": "400001",
  "associationName": "Mumbai Mandap Association",
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
  "member": {
    "_id": "member_id",
    "name": "John Doe",
    "businessName": "Doe's Sound Systems",
    "phone": "9876543210",
    "state": "Maharashtra",
    "businessType": "sound",
    "city": "Mumbai",
    "pincode": "400001",
    "associationName": "Mumbai Mandap Association",
    "profileImage": null,
    "email": "john@example.com",
    "birthDate": "1990-05-15T00:00:00.000Z",
    "isActive": true,
    "isMobileVerified": false,
    "paymentStatus": "Pending",
    "createdBy": {
      "_id": "admin_id",
      "name": "Admin User",
      "email": "admin@example.com"
    },
    "updatedBy": {
      "_id": "admin_id",
      "name": "Admin User",
      "email": "admin@example.com"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### **Update Member** ⭐ **UPDATED**
```http
PUT /api/members/:id
Authorization: Bearer <admin_jwt_token>
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
  "member": {
    "_id": "member_id",
    "name": "John Doe Updated",
    "businessName": "Doe's Premium Sound Systems",
    "phone": "9876543210",
    "state": "Maharashtra",
    "businessType": "sound",
    "city": "Mumbai",
    "pincode": "400001",
    "associationName": "Mumbai Mandap Association",
    "profileImage": null,
    "email": "john.updated@example.com",
    "birthDate": "1990-05-15T00:00:00.000Z",
    "isActive": true,
    "isMobileVerified": false,
    "paymentStatus": "Pending",
    "createdBy": {
      "_id": "admin_id",
      "name": "Admin User",
      "email": "admin@example.com"
    },
    "updatedBy": {
      "_id": "admin_id",
      "name": "Admin User",
      "email": "admin@example.com"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

#### **Get All Members**
```http
GET /api/members?page=1&limit=10&search=john&city=Mumbai&businessType=sound&sortBy=name&sortOrder=asc
Authorization: Bearer <admin_jwt_token>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)
- `search`: Search in name, business name, phone
- `city`: Filter by city
- `state`: Filter by state
- `businessType`: Filter by business type
- `associationName`: Filter by association
- `sortBy`: Sort field (name, businessName, city, businessType, createdAt)
- `sortOrder`: Sort order (asc, desc)

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 150,
  "page": 1,
  "totalPages": 15,
  "hasNextPage": true,
  "hasPrevPage": false,
  "members": [
    {
      "_id": "member_id_1",
      "name": "John Doe",
      "businessName": "Doe's Sound Systems",
      "phone": "9876543210",
      "state": "Maharashtra",
      "businessType": "sound",
      "city": "Mumbai",
      "pincode": "400001",
      "associationName": "Mumbai Mandap Association",
      "profileImage": null,
      "email": "john@example.com",
      "birthDate": "1990-05-15T00:00:00.000Z",
      "isActive": true,
      "isMobileVerified": false,
      "paymentStatus": "Pending",
      "createdBy": {
        "_id": "admin_id",
        "name": "Admin User",
        "email": "admin@example.com"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### **Get Single Member**
```http
GET /api/members/:id
Authorization: Bearer <admin_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "member": {
    "_id": "member_id",
    "name": "John Doe",
    "businessName": "Doe's Sound Systems",
    "phone": "9876543210",
    "state": "Maharashtra",
    "businessType": "sound",
    "city": "Mumbai",
    "pincode": "400001",
    "associationName": "Mumbai Mandap Association",
    "profileImage": null,
    "email": "john@example.com",
    "birthDate": "1990-05-15T00:00:00.000Z",
    "isActive": true,
    "isMobileVerified": false,
    "paymentStatus": "Pending",
    "createdBy": {
      "_id": "admin_id",
      "name": "Admin User",
      "email": "admin@example.com"
    },
    "updatedBy": {
      "_id": "admin_id",
      "name": "Admin User",
      "email": "admin@example.com"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

#### **Delete Member**
```http
DELETE /api/members/:id
Authorization: Bearer <admin_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Member deleted successfully"
}
```

### **2. Member Statistics API**

#### **Get Member Statistics**
```http
GET /api/members/stats/overview
Authorization: Bearer <admin_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 150,
    "active": 140,
    "inactive": 10,
    "businessTypes": [
      { "_id": "sound", "count": 45 },
      { "_id": "decorator", "count": 30 },
      { "_id": "catering", "count": 25 },
      { "_id": "generator", "count": 20 },
      { "_id": "madap", "count": 15 },
      { "_id": "light", "count": 15 }
    ],
    "topCities": [
      { "_id": "Mumbai", "count": 50 },
      { "_id": "Pune", "count": 30 },
      { "_id": "Nashik", "count": 20 }
    ],
    "stateStats": [
      { "_id": "Maharashtra", "count": 120 },
      { "_id": "Gujarat", "count": 20 },
      { "_id": "Karnataka", "count": 10 }
    ],
    "topAssociations": [
      { "_id": "Mumbai Mandap Association", "count": 40 },
      { "_id": "Pune Mandap Association", "count": 25 }
    ],
    "recent": [
      {
        "_id": "member_id_1",
        "name": "John Doe",
        "businessName": "Doe's Sound Systems",
        "businessType": "sound",
        "city": "Mumbai",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ]
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

### **Business Type Options**
```javascript
const businessTypes = [
  'sound',
  'decorator', 
  'catering',
  'generator',
  'madap',
  'light'
];
```

### **Payment Status Options**
```javascript
const paymentStatuses = [
  'Paid',
  'Pending',
  'Overdue',
  'Not Required'
];
```

## ❌ **Error Responses**

### **Validation Errors**
```json
{
  "success": false,
  "errors": [
    {
      "msg": "Birth date must be a valid date",
      "param": "birthDate",
      "location": "body"
    },
    {
      "msg": "Please provide a valid email",
      "param": "email",
      "location": "body"
    }
  ]
}
```

### **Age Validation Error**
```json
{
  "success": false,
  "message": "Member must be at least 18 years old"
}
```

### **Duplicate Member Error**
```json
{
  "success": false,
  "message": "Member with this phone already exists",
  "debug": {
    "duplicateField": "phone",
    "duplicateValue": "9876543210"
  }
}
```

### **Authentication Error**
```json
{
  "success": false,
  "message": "Not authorized, token failed"
}
```

### **Member Not Found**
```json
{
  "success": false,
  "message": "Member not found"
}
```

## 🌐 **Web App Integration Notes**

### **Form Implementation**
- Use date picker component for birth date selection
- Set maximum date to 18 years ago from current date
- Format: `YYYY-MM-DD` when sending to API
- Display: Format according to app's locale and user preferences

### **Data Table Integration**
- Include birth date column in member listing tables
- Add birth date to member detail views
- Implement sorting by birth date if needed
- Handle `null` values gracefully in display

### **Form Validation**
- Client-side validation: Check if user is at least 18 years old
- Server-side validation: API will validate and return appropriate errors
- Optional field: Don't require birth date for member creation
- Real-time validation feedback

### **Data Handling**
- Store birth date as ISO string in state management
- Parse date for display in UI components
- Handle `null` values gracefully in forms and tables
- Implement proper date formatting utilities

## 🧪 **Testing Examples**

### **Valid Birth Date**
```json
{
  "name": "John Doe",
  "businessName": "Doe's Sound Systems",
  "phone": "9876543210",
  "state": "Maharashtra",
  "businessType": "sound",
  "city": "Mumbai",
  "pincode": "400001",
  "associationName": "Mumbai Mandap Association",
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
  "businessName": "Doe's Sound Systems",
  "phone": "9876543210",
  "state": "Maharashtra",
  "businessType": "sound",
  "city": "Mumbai",
  "pincode": "400001",
  "associationName": "Mumbai Mandap Association"
  // birthDate omitted - this is valid
}
```

## 📊 **Admin Dashboard Integration**

### **Member Management Table**
- Add birth date column to member listing
- Implement date formatting for display
- Add birth date filter option
- Include birth date in member export functionality

### **Member Form**
- Add birth date field to create/edit member forms
- Implement date picker with age validation
- Show age calculation based on birth date
- Handle optional field validation

### **Statistics Dashboard**
- Consider adding age-based statistics
- Implement birth date range filters
- Add age group analytics if needed

## 🔐 **Security & Permissions**

### **Access Control**
- All member management endpoints require admin authentication
- JWT token must be valid and not expired
- Admin role verification for create/update/delete operations

### **Data Validation**
- Server-side validation for all input fields
- Age validation to prevent underage registrations
- Input sanitization for security

## 📞 **Support**
For any questions or issues with the API integration, please contact the backend development team.

---
**Last Updated**: September 5, 2025  
**Version**: 1.1.0 (Birth Date Integration)  
**Target**: Web Application (React Frontend)
