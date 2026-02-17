# 📱 Complete Mobile API Documentation

## Base URL
```
Development: http://localhost:5000/api/mobile
Production: https://your-domain.com/api/mobile
```

## Authentication
All protected endpoints require Bearer Token in Authorization header:
```
Authorization: Bearer <accessToken>
```

---

## 🔐 1. Authentication APIs

### 1.1 Send OTP
**Endpoint:** `POST /api/mobile/send-otp`  
**Access:** Public

**Request Body:**
```json
{
  "mobileNumber": "9876543210"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully to your mobile number",
  "otp": "123456",
  "deliveryMethod": "whatsapp",
  "whatsappEnabled": true
}
```

---

### 1.2 Verify OTP & Login
**Endpoint:** `POST /api/mobile/verify-otp`  
**Access:** Public

**Request Body:**
```json
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
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "2cdef780c851706524096d9d158fb0c67b3eff26897d29d535...",
  "expiresIn": 86400,
  "refreshExpiresIn": 2592000,
  "member": {
    "id": 217,
    "name": "John Doe",
    "businessName": "Doe's Sound Systems",
    "businessType": "sound",
    "phone": "9876543210",
    "city": "Mumbai",
    "associationName": "Mumbai Mandap Association",
    "isActive": true
  }
}
```

---

### 1.3 Register New Member
**Endpoint:** `POST /api/mobile/register`  
**Access:** Public

**Request Body:**
```json
{
  "name": "John Doe",
  "businessName": "Doe's Sound Systems",
  "businessType": "sound",
  "phone": "9876543210",
  "city": "Mumbai",
  "pincode": "400001",
  "associationName": "Mumbai Mandap Association",
  "associationId": 1,
  "state": "Maharashtra",
  "email": "john@example.com",
  "birthDate": "1990-01-15"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Member registered successfully. Please login with your mobile number.",
  "member": {
    "_id": "123",
    "name": "John Doe",
    "businessName": "Doe's Sound Systems",
    "businessType": "sound",
    "phone": "9876543210",
    "city": "Mumbai",
    "associationName": "Mumbai Mandap Association"
  }
}
```

---

### 1.4 Refresh Access Token
**Endpoint:** `POST /api/mobile/refresh-token`  
**Access:** Public

**Request Body:**
```json
{
  "refreshToken": "2cdef780c851706524096d9d158fb0c67b3eff26897d29d535..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "member": {
    "id": 217,
    "name": "John Doe",
    "businessName": "Doe's Sound Systems",
    "businessType": "sound",
    "phone": "9876543210",
    "city": "Mumbai",
    "associationName": "Mumbai Mandap Association",
    "isActive": true
  }
}
```

---

### 1.5 Logout
**Endpoint:** `POST /api/mobile/logout`  
**Access:** Private

**Request Body (Optional):**
```json
{
  "refreshToken": "2cdef780c851706524096d9d158fb0c67b3eff26897d29d535..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 1.6 Get Active Sessions
**Endpoint:** `GET /api/mobile/sessions`  
**Access:** Private

**Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "id": 1,
      "deviceInfo": {
        "platform": "android",
        "appVersion": "1.0.0"
      },
      "ipAddress": "192.168.1.1",
      "lastUsedAt": "2025-11-17T10:00:00Z",
      "createdAt": "2025-11-15T08:00:00Z"
    }
  ]
}
```

---

### 1.7 Revoke All Sessions
**Endpoint:** `POST /api/mobile/revoke-all-sessions`  
**Access:** Private

**Response:**
```json
{
  "success": true,
  "message": "Revoked 3 active sessions",
  "revokedCount": 3
}
```

---

## 👤 2. Profile APIs

### 2.1 Get Profile
**Endpoint:** `GET /api/mobile/profile`  
**Access:** Private

**Response:**
```json
{
  "success": true,
  "member": {
    "id": 217,
    "name": "John Doe",
    "businessName": "Doe's Sound Systems",
    "businessType": "sound",
    "phone": "9876543210",
    "email": "john@example.com",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "associationName": "Mumbai Mandap Association",
    "profileImage": "https://cloudinary.com/image.jpg",
    "birthDate": "1990-01-15",
    "isActive": true,
    "association": {
      "name": "Mumbai Mandap Association"
    }
  }
}
```

---

### 2.2 Update Profile
**Endpoint:** `PUT /api/mobile/profile`  
**Access:** Private

**Request Body:**
```json
{
  "name": "John Doe Updated",
  "businessName": "Doe's Sound Systems Updated",
  "businessType": "sound",
  "city": "Mumbai",
  "pincode": "400001",
  "associationName": "Mumbai Mandap Association",
  "email": "john.updated@example.com",
  "birthDate": "1990-01-15"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "member": {
    "id": 217,
    "name": "John Doe Updated",
    "businessName": "Doe's Sound Systems Updated",
    ...
  }
}
```

---

## 👥 3. Member APIs

### 3.1 Get All Members
**Endpoint:** `GET /api/mobile/members`  
**Access:** Public

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `businessType` (optional): Filter by business type
- `city` (optional): Filter by city
- `search` (optional): Search by name, business name, or phone
- `paymentStatus` (optional): Filter by payment status

**Response:**
```json
{
  "success": true,
  "members": [
    {
      "_id": "217",
      "name": "John Doe",
      "businessName": "Doe's Sound Systems",
      "businessType": "sound",
      "phone": "9876543210",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "associationName": "Mumbai Mandap Association",
      "profileImage": "https://cloudinary.com/image.jpg",
      "isActive": true,
      "isMobileVerified": true,
      "paymentStatus": "Paid",
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "totalMembers": 150,
  "page": 1,
  "limit": 50,
  "hasNextPage": true
}
```

---

### 3.2 Get Member by ID
**Endpoint:** `GET /api/mobile/members/:id`  
**Access:** Private

**Response:**
```json
{
  "success": true,
  "member": {
    "id": 217,
    "name": "John Doe",
    "businessName": "Doe's Sound Systems",
    "businessType": "sound",
    "phone": "9876543210",
    "email": "john@example.com",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "associationName": "Mumbai Mandap Association",
    "profileImage": "https://cloudinary.com/image.jpg",
    "association": {
      "id": 1,
      "name": "Mumbai Mandap Association",
      "description": "Association description",
      "city": "Mumbai",
      "state": "Maharashtra",
      "phone": "9876543210",
      "email": "contact@association.com"
    }
  }
}
```

---

### 3.3 Search Members
**Endpoint:** `GET /api/mobile/members/search`  
**Access:** Private

**Query Parameters:**
- `q` (optional): Search query
- `businessType` (optional): Filter by business type
- `city` (optional): Filter by city
- `associationName` (optional): Filter by association
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 25,
  "page": 1,
  "pages": 3,
  "members": [...]
}
```

---

### 3.4 Filter Members
**Endpoint:** `GET /api/mobile/members/filter`  
**Access:** Private

**Query Parameters:**
- `businessType` (optional)
- `city` (optional)
- `state` (optional)
- `associationName` (optional)
- `paymentStatus` (optional)
- `page` (optional)
- `limit` (optional)

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 25,
  "page": 1,
  "pages": 3,
  "members": [...]
}
```

---

### 3.5 Get Today's Birthdays
**Endpoint:** `GET /api/mobile/birthdays/today`  
**Access:** Private

**Response:**
```json
{
  "success": true,
  "count": 2,
  "date": "2025-11-17",
  "message": "Found 2 member(s) celebrating birthday today",
  "members": [
    {
      "id": 217,
      "name": "John Doe",
      "businessName": "Doe's Sound Systems",
      "businessType": "sound",
      "city": "Mumbai",
      "state": "Maharashtra",
      "profileImage": "https://cloudinary.com/image.jpg",
      "birthDate": "1990-11-17",
      "phone": "9876543210",
      "email": "john@example.com",
      "age": 35,
      "associationName": "Mumbai Mandap Association"
    }
  ]
}
```

---

### 3.6 Get Upcoming Birthdays
**Endpoint:** `GET /api/mobile/birthdays/upcoming`  
**Access:** Private

**Response:**
```json
{
  "success": true,
  "count": 5,
  "period": "next 7 days",
  "message": "Found 5 member(s) with upcoming birthdays",
  "members": [
    {
      "id": 217,
      "name": "John Doe",
      "businessName": "Doe's Sound Systems",
      "businessType": "sound",
      "city": "Mumbai",
      "state": "Maharashtra",
      "profileImage": "https://cloudinary.com/image.jpg",
      "birthDate": "1990-11-20",
      "phone": "9876543210",
      "email": "john@example.com",
      "age": 35,
      "daysUntilBirthday": 3,
      "associationName": "Mumbai Mandap Association"
    }
  ]
}
```

---

## 🎉 4. Event APIs

### 4.1 Get All Events
**Endpoint:** `GET /api/mobile/events`  
**Access:** Public

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `type` (optional): Filter by event type
- `city` (optional): Filter by city
- `search` (optional): Search query

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 50,
  "page": 1,
  "pages": 3,
  "events": [
    {
      "id": 33,
      "title": "Mandapam Event",
      "description": "Event description",
      "startDate": "2026-01-07T00:00:00Z",
      "endDate": "2026-01-08T00:00:00Z",
      "location": "Mumbai",
      "city": "Mumbai",
      "registrationFee": 500,
      "maxAttendees": 100,
      "currentAttendees": 50,
      "isRegistered": true,
      "registrationStatus": "registered",
      "registeredAt": "2025-11-17T08:00:00Z",
      "canRegister": false
    }
  ]
}
```

---

### 4.2 Get Upcoming Events
**Endpoint:** `GET /api/mobile/events/upcoming`  
**Access:** Public

**Query Parameters:**
- `page` (optional)
- `limit` (optional)

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 30,
  "page": 1,
  "pages": 3,
  "events": [...]
}
```

---

### 4.3 Get Past Events
**Endpoint:** `GET /api/mobile/events/past`  
**Access:** Private

**Query Parameters:**
- `page` (optional)
- `limit` (optional)
- `type` (optional)
- `city` (optional)
- `search` (optional)

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 20,
  "page": 1,
  "pages": 2,
  "events": [...]
}
```

---

### 4.4 Search Events
**Endpoint:** `GET /api/mobile/events/search`  
**Access:** Private

**Query Parameters:**
- `q` (optional): Search query
- `type` (optional)
- `city` (optional)
- `page` (optional)
- `limit` (optional)

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 25,
  "page": 1,
  "pages": 3,
  "events": [...]
}
```

---

### 4.5 Get Event Statistics
**Endpoint:** `GET /api/mobile/events/stats`  
**Access:** Private

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalEvents": 100,
    "upcomingEvents": 30,
    "pastEvents": 70,
    "ongoingEvents": 0,
    "completedEvents": 70
  },
  "eventTypes": [
    {
      "type": "conference",
      "count": 50
    },
    {
      "type": "workshop",
      "count": 30
    }
  ]
}
```

---

### 4.6 Get Event Details
**Endpoint:** `GET /api/mobile/events/:id`  
**Access:** Public

**Response:**
```json
{
  "success": true,
  "event": {
    "id": 33,
    "title": "Mandapam Event",
    "description": "Event description",
    "startDate": "2026-01-07T00:00:00Z",
    "endDate": "2026-01-08T00:00:00Z",
    "location": "Mumbai",
    "city": "Mumbai",
    "registrationFee": 500,
    "maxAttendees": 100,
    "currentAttendees": 50,
    "exhibitors": [...]
  }
}
```

---

## 💳 5. Event Registration & Payment APIs

### 5.1 Create Payment Order
**Endpoint:** `POST /api/mobile/events/:id/register-payment`  
**Access:** Private

**Response:**
```json
{
  "success": true,
  "isFree": false,
  "order": {
    "id": "order_ABC123",
    "amount": 50000,
    "currency": "INR",
    "status": "created"
  },
  "keyId": "rzp_test_123456",
  "paymentOptions": {
    "key": "rzp_test_123456",
    "amount": 50000,
    "currency": "INR",
    "name": "Mandapam Event",
    "description": "Event Registration Fee - Mandapam Event",
    "order_id": "order_ABC123",
    "prefill": {
      "name": "John Doe",
      "email": "john@example.com",
      "contact": "9876543210"
    },
    "theme": {
      "color": "#2563eb"
    },
    "notes": {
      "eventId": "33",
      "memberId": "217",
      "eventName": "Mandapam Event"
    }
  }
}
```

**For Free Events:**
```json
{
  "success": true,
  "isFree": true,
  "message": "This event is free. Please use the RSVP endpoint to register.",
  "event": {
    "id": 33,
    "title": "Free Event",
    "registrationFee": 0
  }
}
```

---

### 5.2 Confirm Payment
**Endpoint:** `POST /api/mobile/events/:id/confirm-payment`  
**Access:** Private

**Request Body:**
```json
{
  "razorpay_order_id": "order_ABC123",
  "razorpay_payment_id": "pay_XYZ789",
  "razorpay_signature": "signature_hash",
  "notes": "Optional notes"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration confirmed",
  "registrationId": 8638,
  "qrDataURL": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "member": {
    "name": "John Doe",
    "profileImageURL": "https://cloudinary.com/image.jpg"
  },
  "registration": {
    "id": 8638,
    "eventId": 33,
    "memberId": 217,
    "status": "registered",
    "paymentStatus": "paid",
    "amountPaid": 500
  }
}
```

---

### 5.3 Get My Registrations
**Endpoint:** `GET /api/mobile/my/events`  
**Access:** Private

**Response:**
```json
{
  "success": true,
  "registrations": [
    {
      "id": 8638,
      "event": {
        "id": 33,
        "title": "Mandapam Event",
        "startDate": "2026-01-07T00:00:00Z",
        "endDate": "2026-01-08T00:00:00Z",
        "location": "Mumbai",
        "exhibitors": [...]
      },
      "status": "registered",
      "paymentStatus": "paid",
      "registeredAt": "2025-11-17T08:00:00Z",
      "attendedAt": null,
      "qrDataURL": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
      "member": {
        "name": "John Doe",
        "profileImageURL": "https://cloudinary.com/image.jpg"
      }
    }
  ]
}
```

---

### 5.4 Get QR Code for Registration
**Endpoint:** `GET /api/mobile/registrations/:id/qr`  
**Access:** Private

**Response:**
```json
{
  "success": true,
  "qrDataURL": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "member": {
    "name": "John Doe",
    "profileImageURL": "https://cloudinary.com/image.jpg"
  }
}
```

---

### 5.5 RSVP (Register for Free Event)
**Endpoint:** `POST /api/mobile/events/:id/rsvp`  
**Access:** Private

**Request Body (Optional):**
```json
{
  "notes": "Looking forward to the event"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully registered for event",
  "registration": {
    "id": 8638,
    "eventId": 33,
    "memberId": 217,
    "status": "registered",
    "registeredAt": "2025-11-17T08:00:00Z",
    "notes": "Looking forward to the event"
  },
  "member": {
    "name": "John Doe",
    "profileImageURL": "https://cloudinary.com/image.jpg"
  }
}
```

---

### 5.6 Cancel RSVP
**Endpoint:** `DELETE /api/mobile/events/:id/rsvp`  
**Access:** Private

**Response:**
```json
{
  "success": true,
  "message": "Successfully cancelled event registration",
  "registration": {
    "id": 8638,
    "eventId": 33,
    "memberId": 217,
    "status": "cancelled",
    "registeredAt": "2025-11-17T08:00:00Z"
  }
}
```

---

### 5.7 Check Registration Status
**Endpoint:** `GET /api/mobile/events/:id/rsvp`  
**Access:** Private

**Response (Registered):**
```json
{
  "success": true,
  "isRegistered": true,
  "registration": {
    "id": 8638,
    "eventId": 33,
    "memberId": 217,
    "status": "registered",
    "registeredAt": "2025-11-17T08:00:00Z",
    "notes": "Looking forward to the event",
    "event": {
      "id": 33,
      "title": "Mandapam Event",
      "startDate": "2026-01-07T00:00:00Z",
      "status": "active"
    }
  }
}
```

**Response (Not Registered):**
```json
{
  "success": true,
  "isRegistered": false,
  "message": "Not registered for this event"
}
```

---

### 5.8 Get My Event Registrations
**Endpoint:** `GET /api/mobile/events/my-registrations`  
**Access:** Private

**Query Parameters:**
- `page` (optional)
- `limit` (optional)
- `status` (optional): Filter by status

**Response:**
```json
{
  "success": true,
  "registrations": [
    {
      "id": 8638,
      "eventId": 33,
      "status": "registered",
      "registeredAt": "2025-11-17T08:00:00Z",
      "notes": "Looking forward to the event",
      "event": {
        "id": 33,
        "title": "Mandapam Event",
        "description": "Event description",
        "startDate": "2026-01-07T00:00:00Z",
        "endDate": "2026-01-08T00:00:00Z",
        "location": "Mumbai",
        "status": "active",
        "maxAttendees": 100,
        "currentAttendees": 50
      }
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 20,
  "hasNextPage": false
}
```

---

## 🏢 6. Association APIs

### 6.1 Get All Associations
**Endpoint:** `GET /api/mobile/associations`  
**Access:** Public

**Query Parameters:**
- `page` (optional)
- `limit` (optional)
- `state` (optional)
- `city` (optional)
- `search` (optional)

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 50,
  "page": 1,
  "pages": 5,
  "associations": [
    {
      "id": 1,
      "name": "Mumbai Mandap Association",
      "description": "Association description",
      "city": "Mumbai",
      "state": "Maharashtra",
      "phone": "9876543210",
      "email": "contact@association.com",
      "totalMembers": 150,
      "isActive": true
    }
  ]
}
```

---

### 6.2 Get Association by ID
**Endpoint:** `GET /api/mobile/associations/:id`  
**Access:** Private

**Response:**
```json
{
  "success": true,
  "association": {
    "id": 1,
    "name": "Mumbai Mandap Association",
    "description": "Association description",
    "city": "Mumbai",
    "state": "Maharashtra",
    "phone": "9876543210",
    "email": "contact@association.com",
    "memberCount": 150,
    "isActive": true
  }
}
```

---

### 6.3 Search Associations
**Endpoint:** `GET /api/mobile/associations/search`  
**Access:** Public

**Query Parameters:**
- `q` (optional)
- `state` (optional)
- `city` (optional)
- `page` (optional)
- `limit` (optional)

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 25,
  "page": 1,
  "pages": 3,
  "associations": [...]
}
```

---

### 6.4 Get Associations by City
**Endpoint:** `GET /api/mobile/associations/city/:city`  
**Access:** Public

**Query Parameters:**
- `page` (optional)
- `limit` (optional)
- `search` (optional)
- `state` (optional)

**Response:**
```json
{
  "success": true,
  "count": 5,
  "total": 10,
  "page": 1,
  "pages": 2,
  "city": "Mumbai",
  "associations": [...]
}
```

---

### 6.5 Get Association Statistics
**Endpoint:** `GET /api/mobile/associations/stats`  
**Access:** Private

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalAssociations": 50,
    "activeAssociations": 45,
    "pendingAssociations": 0,
    "inactiveAssociations": 5
  }
}
```

---

### 6.6 Get Association BOD Members
**Endpoint:** `GET /api/mobile/associations/:id/bod`  
**Access:** Private

**Query Parameters:**
- `page` (optional)
- `limit` (optional)
- `designation` (optional)
- `search` (optional)

**Response:**
```json
{
  "success": true,
  "association": {
    "id": 1,
    "name": "Mumbai Mandap Association",
    "city": "Mumbai",
    "state": "Maharashtra"
  },
  "count": 5,
  "total": 10,
  "page": 1,
  "limit": 50,
  "hasNextPage": false,
  "bods": [
    {
      "_id": "1",
      "name": "John Doe",
      "designation": "President",
      "profileImage": "https://cloudinary.com/image.jpg",
      "contactNumber": "9876543210",
      "email": "john@example.com",
      "isActive": true,
      "associationName": "Mumbai Mandap Association"
    }
  ]
}
```

---

### 6.7 Get Association Members
**Endpoint:** `GET /api/mobile/associations/:id/members`  
**Access:** Private

**Query Parameters:**
- `page` (optional)
- `limit` (optional)
- `search` (optional)
- `businessType` (optional)

**Response:**
```json
{
  "success": true,
  "association": {
    "id": 1,
    "name": "Mumbai Mandap Association",
    "city": "Mumbai",
    "state": "Maharashtra"
  },
  "count": 20,
  "total": 150,
  "page": 1,
  "pages": 8,
  "members": [...]
}
```

---

## 👔 7. Board of Directors APIs

### 7.1 Get All BOD Members
**Endpoint:** `GET /api/mobile/bod`  
**Access:** Private

**Query Parameters:**
- `page` (optional)
- `limit` (optional)
- `designation` (optional)
- `search` (optional)

**Response:**
```json
{
  "success": true,
  "bods": [
    {
      "_id": "1",
      "name": "John Doe",
      "designation": "President",
      "profileImage": "https://cloudinary.com/image.jpg",
      "contactNumber": "9876543210",
      "email": "john@example.com",
      "isActive": true,
      "associationName": "Mumbai Mandap Association"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 50,
  "hasNextPage": false
}
```

---

### 7.2 Get BOD Member by ID
**Endpoint:** `GET /api/mobile/bod/:id`  
**Access:** Private

**Response:**
```json
{
  "success": true,
  "bodMember": {
    "id": 1,
    "name": "John Doe",
    "position": "President",
    "profileImage": "https://cloudinary.com/image.jpg",
    "contactNumber": "9876543210",
    "email": "john@example.com",
    "isActive": true,
    "association": {
      "name": "Mumbai Mandap Association"
    }
  }
}
```

---

### 7.3 Get BOD by Designation
**Endpoint:** `GET /api/mobile/bod/designation/:designation`  
**Access:** Private

**Response:**
```json
{
  "success": true,
  "count": 2,
  "designation": "President",
  "bodMembers": [
    {
      "id": 1,
      "name": "John Doe",
      "position": "President",
      "profileImage": "https://cloudinary.com/image.jpg",
      "contactNumber": "9876543210",
      "email": "john@example.com",
      "isActive": true,
      "association": {
        "name": "Mumbai Mandap Association"
      }
    }
  ]
}
```

---

## 📤 8. Upload APIs

### 8.1 Upload Profile Image
**Endpoint:** `POST /api/mobile/upload/profile-image`  
**Access:** Private  
**Content-Type:** `multipart/form-data`

**Request:**
- Form field: `image` (file)

**Response:**
```json
{
  "success": true,
  "message": "Profile image uploaded successfully",
  "file": {
    "filename": "profile-1234567890.jpg",
    "originalName": "myphoto.jpg",
    "size": 102400,
    "mimetype": "image/jpeg",
    "url": "http://localhost:5000/uploads/profile-1234567890.jpg",
    "localUrl": "/uploads/profile-1234567890.jpg"
  }
}
```

---

### 8.2 Upload Business Images
**Endpoint:** `POST /api/mobile/upload/business-images`  
**Access:** Private  
**Content-Type:** `multipart/form-data`

**Request:**
- Form field: `images` (files, max 10)

**Response:**
```json
{
  "success": true,
  "message": "3 business image(s) uploaded successfully",
  "files": [
    {
      "filename": "business-1234567890.jpg",
      "originalName": "image1.jpg",
      "size": 102400,
      "mimetype": "image/jpeg",
      "url": "http://localhost:5000/uploads/business-1234567890.jpg",
      "localUrl": "/uploads/business-1234567890.jpg"
    }
  ]
}
```

---

### 8.3 Upload Gallery Images
**Endpoint:** `POST /api/mobile/upload/gallery-images`  
**Access:** Private  
**Content-Type:** `multipart/form-data`

**Request:**
- Form field: `images` (files, max 20)

**Response:**
```json
{
  "success": true,
  "message": "5 gallery image(s) uploaded successfully",
  "files": [...]
}
```

---

### 8.4 Delete Uploaded File
**Endpoint:** `DELETE /api/mobile/upload/:filename`  
**Access:** Private

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully",
  "filename": "profile-1234567890.jpg"
}
```

---

### 8.5 Get File Information
**Endpoint:** `GET /api/mobile/upload/info/:filename`  
**Access:** Private

**Response:**
```json
{
  "success": true,
  "file": {
    "filename": "profile-1234567890.jpg",
    "size": 102400,
    "mimetype": "image/jpeg",
    "path": "/uploads/profile-1234567890.jpg"
  }
}
```

---

## 🖼️ 9. Gallery APIs

### 9.1 Get All Gallery Images
**Endpoint:** `GET /api/mobile/gallery`  
**Access:** Public

**Query Parameters:**
- `page` (optional)
- `limit` (optional)

**Response:**
```json
{
  "success": true,
  "count": 20,
  "total": 100,
  "page": 1,
  "pages": 5,
  "gallery": [
    {
      "id": 1,
      "entityType": "event",
      "entityId": 33,
      "filename": "https://cloudinary.com/image.jpg",
      "originalName": "event-photo.jpg",
      "caption": "Event photo",
      "altText": "Event photo alt text",
      "displayOrder": 1,
      "isActive": true,
      "isFeatured": false,
      "imageURL": "https://cloudinary.com/image.jpg",
      "createdAt": "2025-11-17T08:00:00Z",
      "updatedAt": "2025-11-17T08:00:00Z"
    }
  ]
}
```

---

### 9.2 Get Gallery Images for Entity
**Endpoint:** `GET /api/mobile/gallery/:entityType/:entityId`  
**Access:** Public

**Query Parameters:**
- `page` (optional)
- `limit` (optional)
- `featured` (optional): boolean

**Response:**
```json
{
  "success": true,
  "images": [
    {
      "id": 1,
      "entityType": "event",
      "entityId": 33,
      "filename": "https://cloudinary.com/image.jpg",
      "originalName": "event-photo.jpg",
      "caption": "Event photo",
      "altText": "Event photo alt text",
      "displayOrder": 1,
      "isActive": true,
      "isFeatured": false,
      "fileSize": 102400,
      "mimeType": "image/jpeg",
      "uploadedBy": 217,
      "createdAt": "2025-11-17T08:00:00Z",
      "updatedAt": "2025-11-17T08:00:00Z",
      "uploadedByMember": {
        "id": 217,
        "name": "John Doe",
        "phone": "9876543210"
      },
      "imageURL": "https://cloudinary.com/image.jpg"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalImages": 100,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### 9.3 Upload Gallery Images
**Endpoint:** `POST /api/mobile/gallery/:entityType/:entityId`  
**Access:** Private

**Request Body:**
```json
{
  "images": [
    "https://cloudinary.com/image1.jpg",
    "https://cloudinary.com/image2.jpg"
  ],
  "captions": ["Caption 1", "Caption 2"],
  "altTexts": ["Alt text 1", "Alt text 2"]
}
```

**Response:**
```json
{
  "success": true,
  "message": "2 images uploaded successfully",
  "images": [
    {
      "id": 1,
      "entityType": "event",
      "entityId": 33,
      "filename": "https://cloudinary.com/image1.jpg",
      "originalName": "image1.jpg",
      "caption": "Caption 1",
      "altText": "Alt text 1",
      "displayOrder": 1,
      "isActive": true,
      "isFeatured": false,
      "fileSize": null,
      "mimeType": "image/jpeg",
      "uploadedBy": 217,
      "createdAt": "2025-11-17T08:00:00Z",
      "updatedAt": "2025-11-17T08:00:00Z",
      "imageURL": "https://cloudinary.com/image1.jpg"
    }
  ]
}
```

---

### 9.4 Update Gallery Image
**Endpoint:** `PUT /api/mobile/gallery/:id`  
**Access:** Private

**Request Body:**
```json
{
  "caption": "Updated caption",
  "altText": "Updated alt text",
  "displayOrder": 2,
  "isFeatured": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Image updated successfully",
  "image": {
    "id": 1,
    "entityType": "event",
    "entityId": 33,
    "filename": "https://cloudinary.com/image.jpg",
    "originalName": "event-photo.jpg",
    "caption": "Updated caption",
    "altText": "Updated alt text",
    "displayOrder": 2,
    "isActive": true,
    "isFeatured": true,
    "fileSize": 102400,
    "mimeType": "image/jpeg",
    "uploadedBy": 217,
    "createdAt": "2025-11-17T08:00:00Z",
    "updatedAt": "2025-11-17T09:00:00Z",
    "uploadedByMember": {
      "id": 217,
      "name": "John Doe",
      "phone": "9876543210"
    },
    "imageURL": "https://cloudinary.com/image.jpg"
  }
}
```

---

### 9.5 Delete Gallery Image
**Endpoint:** `DELETE /api/mobile/gallery/:id`  
**Access:** Private

**Response:**
```json
{
  "success": true,
  "message": "Image deleted successfully"
}
```

---

### 9.6 Get Gallery Statistics
**Endpoint:** `GET /api/mobile/gallery/:entityType/:entityId/stats`  
**Access:** Private

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalImages": 50,
    "totalSize": 52428800,
    "averageSize": 1048576
  }
}
```

---

## 🔔 10. Notification APIs

### 10.1 Register FCM Token
**Endpoint:** `POST /api/mobile/notifications/register-token`  
**Access:** Private

**Request Body:**
```json
{
  "token": "fcm_token_here",
  "deviceType": "android"
}
```

**Response:**
```json
{
  "success": true,
  "message": "FCM token registered successfully"
}
```

---

### 10.2 Get Notification Preferences
**Endpoint:** `GET /api/mobile/notifications/preferences`  
**Access:** Private

**Response:**
```json
{
  "success": true,
  "preferences": {
    "eventNotifications": true,
    "appUpdateNotifications": true,
    "hasActiveTokens": true
  }
}
```

---

### 10.3 Update Notification Preferences
**Endpoint:** `PUT /api/mobile/notifications/preferences`  
**Access:** Private

**Request Body:**
```json
{
  "eventNotifications": true,
  "appUpdateNotifications": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notification preferences updated successfully"
}
```

---

### 10.4 Get Notification History
**Endpoint:** `GET /api/mobile/notifications/history`  
**Access:** Private

**Query Parameters:**
- `limit` (optional): Default 50
- `offset` (optional): Default 0

**Response:**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": 1,
        "title": "New Event",
        "body": "A new event has been added",
        "type": "event",
        "memberId": 217,
        "createdAt": "2025-11-17T08:00:00Z"
      }
    ],
    "total": 100,
    "limit": 50,
    "offset": 0
  }
}
```

---

### 10.5 Send Test Notification
**Endpoint:** `POST /api/mobile/notifications/test`  
**Access:** Private

**Request Body:**
```json
{
  "title": "Test Notification",
  "body": "This is a test notification",
  "type": "app_update"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Test notification sent successfully",
  "result": {
    "success": true,
    "message": "Notification sent"
  }
}
```

---

## 📱 11. App Update APIs

### 11.1 Check for App Update
**Endpoint:** `GET /api/mobile/app/update-check`  
**Access:** Public (Optional Auth)

**Headers:**
- `x-app-version` (optional): Current app version (e.g., "1.0.0")
- `x-platform` (optional): Platform ("android" or "ios")

**Response:**
```json
{
  "success": true,
  "message": "Update check successful",
  "data": {
    "currentVersion": "1.0.0",
    "latestVersion": "1.1.0",
    "updateAvailable": true,
    "forceUpdate": false,
    "updateUrl": "https://play.google.com/store/apps/details?id=com.mandapam.expo",
    "releaseNotes": "Bug fixes and performance improvements",
    "releaseDate": "2025-11-17T00:00:00Z",
    "minSupportedVersion": "1.0.0"
  }
}
```

---

### 11.2 Get App Version Information
**Endpoint:** `GET /api/mobile/app/version`  
**Access:** Public (Optional Auth)

**Headers:**
- `x-app-version` (optional)
- `x-platform` (optional)

**Response:**
```json
{
  "success": true,
  "message": "Version info retrieved successfully",
  "data": {
    "currentVersion": "1.0.0",
    "latestVersion": "1.1.0",
    "updateAvailable": true,
    "forceUpdate": false,
    "updateUrl": "https://play.google.com/store/apps/details?id=com.mandapam.expo",
    "releaseNotes": "Bug fixes and performance improvements",
    "releaseDate": "2025-11-17T00:00:00Z",
    "minSupportedVersion": "1.0.0"
  }
}
```

---

## 📝 Notes

### Business Types
Valid business types: `catering`, `sound`, `mandap`, `madap`, `light`, `decorator`, `photography`, `videography`, `transport`, `other`

### Payment Status
Valid payment statuses: `pending`, `paid`, `failed`, `refunded`

### Registration Status
Valid registration statuses: `registered`, `cancelled`, `attended`, `no_show`

### Entity Types (Gallery)
Valid entity types: `event`, `member`, `association`, `vendor`

### Error Responses
All endpoints return error responses in this format:
```json
{
  "success": false,
  "message": "Error message here",
  "errors": [
    {
      "msg": "Validation error",
      "param": "fieldName",
      "location": "body"
    }
  ]
}
```

### Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `429`: Too Many Requests
- `500`: Internal Server Error

---

**Last Updated:** November 17, 2025






