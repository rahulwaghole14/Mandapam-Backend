# Complete API Documentation - Mandap Backend

## Base URL
- **Development**: `http://localhost:5000/api`
- **Production**: `https://mandapam-backend-97mi.onrender.com/api`

## Authentication
- **Web API**: Bearer Token (JWT)
- **Mobile API**: Bearer Token (JWT) with `userType: 'member'`

---

## 🔐 Authentication Endpoints

### POST /api/auth/login
**Description**: Login for web admin users  
**Access**: Public  
**Request Body**:
```json
{
  "email": "admin@mandap.com",
  "password": "admin123"
}
```
**Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@mandap.com",
    "role": "admin"
  }
}
```

### POST /api/auth/logout
**Description**: Logout user  
**Access**: Private (Bearer Token)  
**Response**:
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### GET /api/auth/profile
**Description**: Get current user profile  
**Access**: Private (Bearer Token)  
**Response**:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@mandap.com",
    "role": "admin",
    "district": "Default District",
    "state": "Default State"
  }
}
```

### PUT /api/auth/profile
**Description**: Update user profile  
**Access**: Private (Bearer Token)  
**Request Body**:
```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "phone": "9876543210"
}
```

---

## 📱 Mobile Authentication Endpoints

### POST /api/mobile/send-otp
**Description**: Send OTP to mobile number  
**Access**: Public  
**Request Body**:
```json
{
  "mobileNumber": "9881976526"
}
```
**Response**:
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "otpId": "unique-otp-id"
}
```

### POST /api/mobile/verify-otp
**Description**: Verify OTP and login  
**Access**: Public  
**Request Body**:
```json
{
  "mobileNumber": "9881976526",
  "otp": "123456",
  "otpId": "unique-otp-id"
}
```
**Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "member": {
    "id": 1,
    "name": "Member Name",
    "phone": "9881976526",
    "businessName": "Business Name"
  }
}
```

### POST /api/mobile/register
**Description**: Register new member  
**Access**: Public  
**Request Body**:
```json
{
  "name": "Member Name",
  "businessName": "Business Name",
  "businessType": "mandap",
  "phone": "9881976526",
  "email": "member@example.com",
  "city": "Mumbai",
  "state": "Maharashtra",
  "district": "Mumbai",
  "associationName": "Nanded Association",
  "birthDate": "1990-01-01",
  "address": "123 Main Street",
  "pincode": "400001"
}
```

---

## 👥 Members Endpoints

### GET /api/members
**Description**: Get all members with filtering and pagination  
**Access**: Private (Bearer Token)  
**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `search` (optional): Search in name, businessName, city, associationName
- `city` (optional): Filter by city
- `state` (optional): Filter by state
- `businessType` (optional): Filter by business type
- `associationName` (optional): Filter by association name
- `sortBy` (optional): Sort field (name, businessName, city, businessType, created_at)
- `sortOrder` (optional): Sort order (asc, desc)

**Example**: `GET /api/members?page=1&limit=20&search=mumbai&businessType=mandap`

### GET /api/members/:id
**Description**: Get specific member details  
**Access**: Private (Bearer Token)  
**Path Parameters**:
- `id`: Member ID

### POST /api/members
**Description**: Create new member  
**Access**: Private (Bearer Token)  
**Request Body**:
```json
{
  "name": "Member Name",
  "businessName": "Business Name",
  "businessType": "mandap",
  "phone": "9881976526",
  "email": "member@example.com",
  "city": "Mumbai",
  "state": "Maharashtra",
  "district": "Mumbai",
  "associationName": "Nanded Association",
  "birthDate": "1990-01-01",
  "address": "123 Main Street",
  "pincode": "400001",
  "gstNumber": "27ABCDE1234F1Z5",
  "description": "Business description",
  "experience": 5
}
```

### PUT /api/members/:id
**Description**: Update member  
**Access**: Private (Bearer Token)  
**Path Parameters**:
- `id`: Member ID

### DELETE /api/members/:id
**Description**: Delete member  
**Access**: Private (Bearer Token, Admin only)  
**Path Parameters**:
- `id`: Member ID

---

## 📊 CSV Import Endpoints

### POST /api/members/import-csv
**Description**: Import members from CSV data  
**Access**: Private (Bearer Token, Admin only)  
**Request Body**:
```json
{
  "members": [
    {
      "name": "Member Name",
      "businessName": "Business Name",
      "businessType": "mandap",
      "phone": "9881976526",
      "email": "member@example.com",
      "city": "Mumbai",
      "state": "Maharashtra",
      "district": "Mumbai",
      "associationName": "Nanded Association",
      "birthDate": "01-01-1990",
      "address": "123 Main Street",
      "pincode": "400001",
      "gstNumber": "",
      "description": "",
      "experience": ""
    }
  ]
}
```
**Response**:
```json
{
  "success": true,
  "message": "Import completed",
  "summary": {
    "total": 1,
    "imported": 1,
    "failed": 0,
    "skipped": 0
  },
  "errors": [],
  "warnings": [],
  "importedMembers": [
    {
      "id": 123,
      "name": "Member Name",
      "businessName": "Business Name",
      "phone": "9881976526"
    }
  ]
}
```

---

## 📅 Events Endpoints

### GET /api/events
**Description**: Get all events with filtering and pagination  
**Access**: Private (Bearer Token)  
**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `search` (optional): Search in title, description, contactPerson
- `type` (optional): Filter by event type
- `status` (optional): Filter by status (Upcoming, Ongoing, Completed, Cancelled, Postponed)
- `priority` (optional): Filter by priority (Low, Medium, High, Urgent)
- `city` (optional): Filter by city
- `district` (optional): Filter by district
- `dateFrom` (optional): Filter events from date (ISO8601)
- `dateTo` (optional): Filter events to date (ISO8601)
- `sortBy` (optional): Sort field (title, date, priority, created_at)
- `sortOrder` (optional): Sort order (asc, desc)

### GET /api/events/:id
**Description**: Get specific event details  
**Access**: Private (Bearer Token)  
**Path Parameters**:
- `id`: Event ID

### POST /api/events
**Description**: Create new event  
**Access**: Private (Bearer Token)  
**Request Body**:
```json
{
  "title": "Event Title",
  "description": "Event description",
  "type": "Meeting",
  "startDate": "2025-12-25T10:00:00.000Z",
  "endDate": "2025-12-25T18:00:00.000Z",
  "location": "Event Location",
  "address": "Event Address",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "contactPerson": "Contact Person",
  "contactPhone": "9876543210",
  "contactEmail": "contact@example.com",
  "maxAttendees": 100,
  "registrationFee": 500,
  "priority": "Medium",
  "isPublic": true
}
```

### PUT /api/events/:id
**Description**: Update event  
**Access**: Private (Bearer Token)  
**Path Parameters**:
- `id`: Event ID

### DELETE /api/events/:id
**Description**: Delete event  
**Access**: Private (Bearer Token)  
**Path Parameters**:
- `id`: Event ID

---

## 📱 Mobile Events Endpoints

### GET /api/mobile/events
**Description**: Get all events (past, current, future)  
**Access**: Private (Mobile Bearer Token)  
**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `type` (optional): Filter by event type
- `city` (optional): Filter by city
- `search` (optional): Search in title, description, contactPerson

### GET /api/mobile/events/upcoming
**Description**: Get all events (renamed but shows all)  
**Access**: Private (Mobile Bearer Token)  
**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

### GET /api/mobile/events/past
**Description**: Get past events only  
**Access**: Private (Mobile Bearer Token)  
**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `type` (optional): Filter by event type
- `city` (optional): Filter by city
- `search` (optional): Search in title, description, contactPerson

### GET /api/mobile/events/search
**Description**: Search events  
**Access**: Private (Mobile Bearer Token)  
**Query Parameters**:
- `q` (required): Search query
- `type` (optional): Filter by event type
- `city` (optional): Filter by city
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

### GET /api/mobile/events/stats
**Description**: Get event statistics  
**Access**: Private (Mobile Bearer Token)  
**Response**:
```json
{
  "success": true,
  "stats": {
    "totalEvents": 50,
    "upcomingEvents": 20,
    "pastEvents": 30,
    "ongoingEvents": 0,
    "completedEvents": 30
  },
  "eventTypes": [
    {"type": "Meeting", "count": 25},
    {"type": "Conference", "count": 15}
  ]
}
```

### GET /api/mobile/events/:id
**Description**: Get specific event details  
**Access**: Private (Mobile Bearer Token)  
**Path Parameters**:
- `id`: Event ID

---

## 🏢 Associations Endpoints

### GET /api/associations
**Description**: Get all associations  
**Access**: Private (Bearer Token)  
**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search in name, city, state
- `city` (optional): Filter by city
- `state` (optional): Filter by state
- `isActive` (optional): Filter by active status

### GET /api/associations/:id
**Description**: Get specific association details  
**Access**: Private (Bearer Token)  
**Path Parameters**:
- `id`: Association ID

### POST /api/associations
**Description**: Create new association  
**Access**: Private (Bearer Token, Admin/Sub-admin only)  
**Request Body**:
```json
{
  "name": "Association Name",
  "description": "Association description",
  "address": "Association address",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "contactPerson": "Contact Person",
  "contactPhone": "9876543210",
  "contactEmail": "contact@association.com",
  "website": "https://association.com",
  "isActive": true
}
```

### PUT /api/associations/:id
**Description**: Update association  
**Access**: Private (Bearer Token, Admin/Sub-admin only)  
**Path Parameters**:
- `id`: Association ID

### DELETE /api/associations/:id
**Description**: Delete association  
**Access**: Private (Bearer Token, Admin/Sub-admin only)  
**Path Parameters**:
- `id`: Association ID

---

## 👔 BOD (Board of Directors) Endpoints

### GET /api/bod
**Description**: Get all BOD members  
**Access**: Private (Bearer Token)  
**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search in name, designation
- `designation` (optional): Filter by designation
- `isActive` (optional): Filter by active status
- `type` (optional): Filter by type (association, national)
- `associationId` (optional): Filter by association ID

### GET /api/bod/:id
**Description**: Get specific BOD member details  
**Access**: Private (Bearer Token)  
**Path Parameters**:
- `id`: BOD member ID

### POST /api/bod
**Description**: Create new BOD member  
**Access**: Private (Bearer Token)  
**Request Body**:
```json
{
  "name": "BOD Member Name",
  "designation": "President",
  "email": "bod@example.com",
  "contactNumber": "9876543210",
  "address": "BOD Address",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "profileImage": "image_url",
  "bio": "BOD member bio",
  "experience": 10,
  "termStart": "2025-01-01",
  "termEnd": "2027-12-31",
  "associationId": 1,
  "isActive": true
}
```

### PUT /api/bod/:id
**Description**: Update BOD member  
**Access**: Private (Bearer Token)  
**Path Parameters**:
- `id`: BOD member ID

### DELETE /api/bod/:id
**Description**: Delete BOD member  
**Access**: Private (Bearer Token, Admin only)  
**Path Parameters**:
- `id`: BOD member ID

---

## 🏪 Vendors Endpoints

### GET /api/vendors
**Description**: Get all vendors  
**Access**: Private (Bearer Token)  
**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `search` (optional): Search in name, businessName, city
- `city` (optional): Filter by city
- `state` (optional): Filter by state
- `businessType` (optional): Filter by business type
- `status` (optional): Filter by status (Active, Pending, Inactive)

### GET /api/vendors/:id
**Description**: Get specific vendor details  
**Access**: Private (Bearer Token)  
**Path Parameters**:
- `id`: Vendor ID

### POST /api/vendors
**Description**: Create new vendor  
**Access**: Private (Bearer Token)  
**Request Body**:
```json
{
  "name": "Vendor Name",
  "businessName": "Business Name",
  "businessType": "catering",
  "phone": "9876543210",
  "email": "vendor@example.com",
  "address": "Vendor Address",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "gstNumber": "27ABCDE1234F1Z5",
  "description": "Vendor description",
  "experience": 5,
  "status": "Active"
}
```

### PUT /api/vendors/:id
**Description**: Update vendor  
**Access**: Private (Bearer Token)  
**Path Parameters**:
- `id`: Vendor ID

### DELETE /api/vendors/:id
**Description**: Delete vendor  
**Access**: Private (Bearer Token, Admin only)  
**Path Parameters**:
- `id`: Vendor ID

---

## 📊 Dashboard Endpoints

### GET /api/dashboard/stats
**Description**: Get dashboard overview statistics  
**Access**: Private (Bearer Token)  
**Response**:
```json
{
  "success": true,
  "stats": {
    "vendors": {
      "total": 100,
      "active": 80,
      "pending": 20
    },
    "members": {
      "total": 500,
      "active": 450
    },
    "events": {
      "total": 50,
      "upcoming": 20
    },
    "bod": {
      "total": 30,
      "active": 25
    },
    "associations": {
      "total": 10,
      "active": 8
    },
    "growthRate": 15,
    "districtCoverage": 5
  }
}
```

### GET /api/dashboard/recent-members
**Description**: Get recent members with birthDate field  
**Access**: Private (Bearer Token)  
**Query Parameters**:
- `limit` (optional): Number of members to return (default: 10, max: 50)

**Response**:
```json
{
  "success": true,
  "members": [
    {
      "memberId": 123,
      "name": "Member Name",
      "businessName": "Business Name",
      "phone": "9881976526",
      "associationName": "Nanded Association",
      "dateAdded": "2025-09-15T06:43:08.088Z",
      "profileImage": "image_url",
      "city": "Mumbai",
      "state": "Maharashtra",
      "birthDate": "1990-01-01",
      "createdBy": "Admin"
    }
  ]
}
```

### GET /api/dashboard/district-coverage
**Description**: Get district coverage data  
**Access**: Private (Bearer Token)

### GET /api/dashboard/growth-trends
**Description**: Get growth trends data  
**Access**: Private (Bearer Token)  
**Query Parameters**:
- `year` (optional): Year for trends (default: current year)

### GET /api/dashboard/associations-map
**Description**: Get associations map data  
**Access**: Private (Bearer Token)

### GET /api/dashboard/monthly-member-growth
**Description**: Get monthly member growth data  
**Access**: Private (Bearer Token)  
**Query Parameters**:
- `year` (optional): Year for growth data (default: current year)

### GET /api/dashboard/top-associations
**Description**: Get top associations data  
**Access**: Private (Bearer Token)

---

## 📱 Mobile Members Endpoints

### GET /api/mobile/profile
**Description**: Get member profile  
**Access**: Private (Mobile Bearer Token)  
**Response**:
```json
{
  "success": true,
  "member": {
    "id": 1,
    "name": "Member Name",
    "businessName": "Business Name",
    "businessType": "mandap",
    "phone": "9881976526",
    "email": "member@example.com",
    "city": "Mumbai",
    "state": "Maharashtra",
    "birthDate": "1990-01-01"
  }
}
```

### PUT /api/mobile/profile
**Description**: Update member profile  
**Access**: Private (Mobile Bearer Token)  
**Request Body**:
```json
{
  "name": "Updated Name",
  "businessName": "Updated Business",
  "email": "updated@example.com",
  "address": "Updated Address",
  "description": "Updated Description"
}
```

### GET /api/mobile/members
**Description**: Get all members (for mobile app)  
**Access**: Private (Mobile Bearer Token)  
**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `businessType` (optional): Filter by business type
- `city` (optional): Filter by city
- `search` (optional): Search in name, businessName, phone
- `paymentStatus` (optional): Filter by payment status

### GET /api/mobile/members/search
**Description**: Search members  
**Access**: Private (Mobile Bearer Token)  
**Query Parameters**:
- `q` (required): Search query
- `businessType` (optional): Filter by business type
- `city` (optional): Filter by city
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

### GET /api/mobile/members/:id
**Description**: Get specific member details  
**Access**: Private (Mobile Bearer Token)  
**Path Parameters**:
- `id`: Member ID

### GET /api/mobile/birthdays/today
**Description**: Get today's birthdays  
**Access**: Private (Mobile Bearer Token)  
**Response**:
```json
{
  "success": true,
  "birthdays": [
    {
      "id": 1,
      "name": "Member Name",
      "businessName": "Business Name",
      "phone": "9881976526",
      "birthDate": "1990-09-15"
    }
  ]
}
```

### GET /api/mobile/birthdays/upcoming
**Description**: Get upcoming birthdays  
**Access**: Private (Mobile Bearer Token)  
**Query Parameters**:
- `days` (optional): Number of days ahead (default: 7)

---

## 📱 Mobile Associations Endpoints

### GET /api/mobile/associations
**Description**: Get all associations (public)  
**Access**: Public  
**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `city` (optional): Filter by city
- `state` (optional): Filter by state
- `search` (optional): Search in name, city, state

### GET /api/mobile/associations/:id
**Description**: Get specific association details  
**Access**: Private (Mobile Bearer Token)  
**Path Parameters**:
- `id`: Association ID

### GET /api/mobile/bod
**Description**: Get all BOD members  
**Access**: Private (Mobile Bearer Token)  
**Query Parameters**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `associationId` (optional): Filter by association ID
- `designation` (optional): Filter by designation

### GET /api/mobile/bod/:id
**Description**: Get specific BOD member details  
**Access**: Private (Mobile Bearer Token)  
**Path Parameters**:
- `id`: BOD member ID

---

## 📱 Mobile App Update Endpoints

### GET /api/mobile/app/update-check
**Description**: Check for app updates  
**Access**: Public  
**Query Parameters**:
- `currentVersion` (required): Current app version
- `platform` (required): Platform (android, ios)

**Response**:
```json
{
  "success": true,
  "updateAvailable": true,
  "latestVersion": "1.2.0",
  "updateType": "optional",
  "downloadUrl": "https://play.google.com/store/apps/details?id=com.mandap.app",
  "releaseNotes": "Bug fixes and improvements"
}
```

### GET /api/mobile/app/version
**Description**: Get current app version info  
**Access**: Public  
**Response**:
```json
{
  "success": true,
  "version": "1.2.0",
  "platform": "android",
  "releaseDate": "2025-09-15",
  "isActive": true
}
```

---

## 📤 Upload Endpoints

### POST /api/upload/profile-image
**Description**: Upload profile image  
**Access**: Private (Bearer Token)  
**Request**: Multipart form data with `image` field

### DELETE /api/upload/:filename
**Description**: Delete uploaded file  
**Access**: Private (Bearer Token)  
**Path Parameters**:
- `filename`: File name to delete

### GET /api/upload
**Description**: Get upload information  
**Access**: Private (Bearer Token)

---

## 📱 Mobile Upload Endpoints

### POST /api/mobile/upload/profile-image
**Description**: Upload profile image (mobile)  
**Access**: Private (Mobile Bearer Token)  
**Request**: Multipart form data with `image` field

### POST /api/mobile/upload/images
**Description**: Upload multiple images (mobile)  
**Access**: Private (Mobile Bearer Token)  
**Request**: Multipart form data with `images` field (max 5 files)

### DELETE /api/mobile/upload/:filename
**Description**: Delete uploaded file (mobile)  
**Access**: Private (Mobile Bearer Token)  
**Path Parameters**:
- `filename`: File name to delete

### GET /api/mobile/upload/:filename
**Description**: Get uploaded file (mobile)  
**Access**: Private (Mobile Bearer Token)  
**Path Parameters**:
- `filename`: File name to retrieve

---

## 🔧 Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "fieldName",
      "message": "Validation error message"
    }
  ]
}
```

## 📝 Common HTTP Status Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request (validation errors)
- `401`: Unauthorized (invalid/missing token)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found
- `500`: Internal Server Error

## 🔐 Authentication Headers

**Web API**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Mobile API**:
```
Authorization: Bearer <mobile_jwt_token>
Content-Type: application/json
```

---

## 📋 Business Type Values

Valid business types for members and vendors:
- `catering`
- `sound`
- `mandap`
- `madap`
- `light`
- `decorator`
- `photography`
- `videography`
- `transport`
- `other`

## 📅 Date Formats

- **API Input**: `YYYY-MM-DD` or `DD-MM-YYYY`
- **API Output**: `YYYY-MM-DD`
- **DateTime**: ISO8601 format (`2025-09-15T10:00:00.000Z`)

## 📱 Phone Number Format

- **Format**: 10-15 digits
- **Regex**: `^[0-9+\-\s()]{10,15}$`
- **Example**: `9881976526`

## 🏷️ GST Number Format

- **Format**: `27ABCDE1234F1Z5`
- **Regex**: `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`

---

*Last Updated: September 15, 2025*
*Version: 1.0*

