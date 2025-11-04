# Public Event Registration API Documentation

## Overview

This document describes the **public API endpoints** for event registration. These endpoints allow **anyone** to register for events **without authentication**. The system automatically creates member accounts and handles event registration with payment support.

## Base URL
- **Development**: `http://localhost:5000/api/public`
- **Production**: `https://mandapam-backend-97mi.onrender.com/api/public`

## Authentication

**No authentication required** - All endpoints are public.

---

## 📋 Registration Flow

```
1. User selects event
   ↓
2. User fills registration form (name, phone, email, business details, city, association)
   ↓
3. POST /api/public/events/:id/register-payment
   → Creates/finds member + Initiates payment (if paid event)
   ↓
4. User completes Razorpay payment (if paid event)
   ↓
5. POST /api/public/events/:id/confirm-payment
   → Verifies payment + Creates registration + Returns QR code
   ↓
6. Registration complete! QR code generated
```

---

## 🔌 API Endpoints

### 1. Get Associations by City

**Endpoint**: `GET /api/public/associations`  
**Access**: Public

Get list of associations filtered by city (for registration form dropdown).

#### Request Parameters

**Query Parameters:**
- `city` (string, required): City name to filter associations

#### Example Request

```
GET /api/public/associations?city=Pune
```

#### Response

**Success (200):**
```json
{
  "success": true,
  "associations": [
    {
      "id": 1,
      "name": "Raigad Association",
      "city": "Pune",
      "district": "Pune",
      "state": "Maharashtra"
    },
    {
      "id": 2,
      "name": "Pune Mandap Association",
      "city": "Pune",
      "district": "Pune",
      "state": "Maharashtra"
    }
  ],
  "count": 2
}
```

**Error (400):**
```json
{
  "success": false,
  "errors": [
    {
      "type": "field",
      "msg": "City is required",
      "path": "city",
      "location": "query"
    }
  ]
}
```

---

### 2. Get Event Details

**Endpoint**: `GET /api/public/events/:id`  
**Access**: Public

Get event details including exhibitors.

#### Request Parameters

**URL Parameters:**
- `id` (integer, required): Event ID

#### Response

**Success (200):**
```json
{
  "success": true,
  "event": {
    "id": 32,
    "title": "Mandapam",
    "description": "Mandap and Decor EXPO",
    "type": "Other",
    "startDate": "2025-01-06T00:00:00.000Z",
    "endDate": "2025-01-08T00:00:00.000Z",
    "address": "Shirdi",
    "city": "Shirdi",
    "state": "Maharashtra",
    "registrationFee": 1000,
    "currentAttendees": 100,
    "maxAttendees": 500,
    "status": "Upcoming",
    "exhibitors": [
      {
        "id": 1,
        "name": "Flower Decorators",
        "businessCategory": "Flower Decoration"
      }
    ]
  }
}
```

**Error (404):**
```json
{
  "success": false,
  "message": "Event not found or not accessible"
}
```

---

### 3. Check Registration Status

**Endpoint**: `GET /api/public/events/:id/check-registration`  
**Access**: Public

Check if a phone number is already registered for an event.

#### Request Parameters

**URL Parameters:**
- `id` (integer, required): Event ID

**Query Parameters:**
- `phone` (string, required): 10-digit phone number

#### Example Request

```
GET /api/public/events/32/check-registration?phone=9876543210
```

#### Response

**Registered (200):**
```json
{
  "success": true,
  "isRegistered": true,
  "registration": {
    "id": 456,
    "eventId": 32,
    "memberId": 123,
    "status": "registered",
    "paymentStatus": "paid",
    "amountPaid": "1000.00",
    "registeredAt": "2025-11-02T17:10:12.774Z",
    "attendedAt": null,
    "qrDataURL": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  },
  "event": {
    "id": 32,
    "title": "Mandapam",
    "startDate": "2025-01-06T00:00:00.000Z",
    "endDate": "2025-01-08T00:00:00.000Z",
    "status": "Upcoming"
  }
}
```

**Not Registered (200):**
```json
{
  "success": true,
  "isRegistered": false,
  "message": "Not registered for this event"
}
```

**Member Not Found (200):**
```json
{
  "success": true,
  "isRegistered": false,
  "message": "Member not found. You can register now."
}
```

---

### 4. Initiate Registration & Payment

**Endpoint**: `POST /api/public/events/:id/register-payment`  
**Access**: Public

Creates/finds member account and initiates payment for event registration. **Accepts photo upload** for member profile image.

#### Request Parameters

**URL Parameters:**
- `id` (integer, required): Event ID

**Request Body (multipart/form-data):**
- `name` (string, required): Full name (2-100 characters)
- `phone` (string, required): 10-digit phone number (unique)
- `email` (string, required): Valid email address
- `businessName` (string, required): Business name (2-200 characters)
- `businessType` (enum, required): One of: `catering`, `sound`, `mandap`, `madap`, `light`, `decorator`, `photography`, `videography`, `transport`, `other`
- `city` (string, required): City name
- `associationId` (integer, required): Association ID (must exist in database)
- `photo` (file, optional): Profile image file (max 5MB, images only: jpg, jpeg, png, gif, webp)

#### Required Fields

- `name` (string): Full name (2-100 characters)
- `phone` (string): 10-digit phone number (unique)
- `email` (string): Valid email address
- `businessName` (string): Business name (2-200 characters)
- `businessType` (enum): One of: `catering`, `sound`, `mandap`, `madap`, `light`, `decorator`, `photography`, `videography`, `transport`, `other`
- `city` (string): City name
- `associationId` (integer): Association ID (must exist in database)

#### Optional Fields

- `photo` (file): Profile image file (max 5MB)

**Note**: The request must be sent as `multipart/form-data` when including a photo.

#### Response

**Free Event (201):**
```json
{
  "success": true,
  "isFree": true,
  "message": "Registration successful (free event)",
  "member": {
    "id": 123,
    "name": "John Doe",
    "phone": "9876543210",
    "isNew": true,
    "profileImageURL": "https://example.com/uploads/profile-images/image-1234567890.jpg"
  },
  "registration": {
    "id": 456,
    "eventId": 32,
    "memberId": 123,
    "status": "registered",
    "paymentStatus": "free"
  },
  "qrDataURL": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

**Paid Event - Payment Required (201):**
```json
{
  "success": true,
  "isFree": false,
  "message": "Member created/retrieved. Payment required.",
  "member": {
    "id": 123,
    "name": "John Doe",
    "phone": "9876543210",
    "isNew": false,
    "profileImageURL": "https://example.com/uploads/profile-images/image-1234567890.jpg"
  },
  "order": {
    "id": "order_RamtONiHbf6jBR",
    "entity": "order",
    "amount": 100000,
    "amount_paid": 0,
    "amount_due": 100000,
    "currency": "INR",
    "receipt": "evt_32_mem_123_1234567890",
    "status": "created",
    "created_at": 1234567890
  },
  "keyId": "rzp_test_RQ5ITAzm7AyNN9",
  "paymentOptions": {
    "key": "rzp_test_RQ5ITAzm7AyNN9",
    "amount": 100000,
    "currency": "INR",
    "name": "Mandapam",
    "description": "Event Registration Fee - Mandapam",
    "order_id": "order_RamtONiHbf6jBR",
    "prefill": {
      "name": "John Doe",
      "email": "john@example.com",
      "contact": "9876543210"
    },
    "theme": {
      "color": "#2563eb"
    },
    "notes": {
      "eventId": "32",
      "memberId": "123",
      "eventName": "Mandapam"
    }
  }
}
```

**Error Responses:**

- **400**: Validation errors, already registered, invalid event ID, past event
- **404**: Event not found, association not found
- **500**: Payment gateway not configured, server error

**Example Error - Already Registered:**
```json
{
  "success": false,
  "message": "Already registered for this event",
  "registrationId": 456,
  "paymentStatus": "paid"
}
```

**Example Error - Validation:**
```json
{
  "success": false,
  "errors": [
    {
      "type": "field",
      "msg": "Phone number is required",
      "path": "phone",
      "location": "body"
    },
    {
      "type": "field",
      "msg": "Phone must be 10 digits",
      "path": "phone",
      "location": "body"
    }
  ]
}
```

---

### 5. Confirm Payment & Complete Registration

**Endpoint**: `POST /api/public/events/:id/confirm-payment`  
**Access**: Public

Verifies payment signature and creates event registration.

#### Request Parameters

**URL Parameters:**
- `id` (integer, required): Event ID

**Request Body:**
```json
{
  "memberId": 123,
  "razorpay_order_id": "order_RamtONiHbf6jBR",
  "razorpay_payment_id": "pay_RamtONiHbf6jBR",
  "razorpay_signature": "signature_hash",
  "notes": "Optional registration notes"
}
```

#### Required Fields

- `memberId` (integer): Member ID returned from register-payment endpoint
- `razorpay_order_id` (string): Order ID from Razorpay
- `razorpay_payment_id` (string): Payment ID from Razorpay
- `razorpay_signature` (string): Payment signature from Razorpay
- `notes` (string, optional): Additional notes

#### Response

**Success (201):**
```json
{
  "success": true,
  "message": "Registration confirmed",
  "registrationId": 456,
  "qrDataURL": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "registration": {
    "id": 456,
    "eventId": 32,
    "memberId": 123,
    "status": "registered",
    "paymentStatus": "paid",
    "amountPaid": "1000.00",
    "registeredAt": "2025-11-02T17:10:12.774Z"
  },
  "member": {
    "id": 123,
    "name": "John Doe",
    "phone": "9876543210"
  }
}
```

**Error Responses:**

- **400**: Invalid payment signature, payment details missing, already registered, free event
- **404**: Event not found, member not found
- **500**: Server error

**Example Error - Invalid Payment:**
```json
{
  "success": false,
  "message": "Invalid payment signature"
}
```

**Example Error - Already Registered:**
```json
{
  "success": false,
  "message": "Already registered and paid for this event"
}
```

---

## 🔑 Key Features

### 1. **Auto Member Creation**
- System automatically checks if member exists by phone number
- If exists: Uses existing member (updates profile image if not already set)
- If not: Creates new member with provided details including profile image
- Returns `isNew: true/false` in response

### 2. **Photo Upload**
- Profile photo can be uploaded during registration
- Image is stored in `uploads/profile-images/` directory
- Maximum file size: 5MB
- Supported formats: jpg, jpeg, png, gif, webp
- Photo URL is returned in response for display
- If member already exists with a photo, existing photo is used unless new one is provided

### 2. **Duplicate Prevention**
- Checks if member is already registered for the event
- Returns error if duplicate registration attempted
- Prevents multiple registrations for same event

### 3. **Payment Flow**
- **Free Events**: Registration created immediately, QR code returned
- **Paid Events**: Payment initiated → User pays → Registration created → QR code returned

### 4. **QR Code Generation**
- QR codes generated on-the-fly after successful registration
- Contains registration details for check-in
- Returned as data URL (base64 PNG image)

---

## 💻 Frontend Implementation Example

### Complete Registration Flow

```javascript
// Step 1: Get associations by city
const getAssociations = async (city) => {
  const response = await fetch(`/api/public/associations?city=${city}`);
  const data = await response.json();
  return data.associations;
};

// Step 2: Check if already registered
const checkRegistration = async (eventId, phone) => {
  const response = await fetch(`/api/public/events/${eventId}/check-registration?phone=${phone}`);
  const data = await response.json();
  return data.isRegistered;
};

// Step 2: Initiate registration and payment (with photo upload)
const initiateRegistration = async (eventId, formData) => {
  const formDataToSend = new FormData();
  formDataToSend.append('name', formData.name);
  formDataToSend.append('phone', formData.phone);
  formDataToSend.append('email', formData.email);
  formDataToSend.append('businessName', formData.businessName);
  formDataToSend.append('businessType', formData.businessType);
  formDataToSend.append('city', formData.city);
  formDataToSend.append('associationId', formData.associationId);
  
  // Add photo if provided
  if (formData.photo) {
    formDataToSend.append('photo', formData.photo);
  }
  
  const response = await fetch(`/api/public/events/${eventId}/register-payment`, {
    method: 'POST',
    body: formDataToSend // FormData automatically sets Content-Type with boundary
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message);
  }
  
  // Free event - registration complete
  if (data.isFree) {
    return {
      success: true,
      isFree: true,
      registration: data.registration,
      qrDataURL: data.qrDataURL,
      profileImageURL: data.member.profileImageURL
    };
  }
  
  // Paid event - proceed with payment
  return {
    success: true,
    isFree: false,
    memberId: data.member.id,
    paymentOptions: data.paymentOptions,
    profileImageURL: data.member.profileImageURL
  };
};

// Step 4: Open Razorpay Checkout
const openRazorpayCheckout = (paymentOptions, eventId, memberId) => {
  const options = {
    ...paymentOptions,
    handler: async function (response) {
      // Payment successful - confirm registration
      await confirmPayment(eventId, memberId, response);
    },
    modal: {
      ondismiss: function() {
        console.log('Payment cancelled');
      }
    }
  };
  
  const rzp = new Razorpay(options);
  rzp.open();
};

// Step 5: Confirm payment and complete registration
const confirmPayment = async (eventId, memberId, razorpayResponse) => {
  const response = await fetch(`/api/public/events/${eventId}/confirm-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      memberId: memberId,
      razorpay_order_id: razorpayResponse.razorpay_order_id,
      razorpay_payment_id: razorpayResponse.razorpay_payment_id,
      razorpay_signature: razorpayResponse.razorpay_signature
    })
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message);
  }
  
  // Registration complete!
  return {
    registration: data.registration,
    qrDataURL: data.qrDataURL
  };
};

// Complete flow
const registerForEvent = async (eventId, formData) => {
  try {
    // 1. Check if already registered
    const isRegistered = await checkRegistration(eventId, formData.phone);
    if (isRegistered) {
      alert('You are already registered for this event!');
      return;
    }
    
    // 2. Initiate registration
    const result = await initiateRegistration(eventId, formData);
    
    if (result.isFree) {
      // Free event - show QR code
      displayQRCode(result.qrDataURL);
      return;
    }
    
    // 3. Paid event - open payment gateway
    openRazorpayCheckout(result.paymentOptions, eventId, result.memberId);
    
  } catch (error) {
    console.error('Registration error:', error);
    alert(error.message);
  }
};
```

**Important**: Include Razorpay Checkout script in your HTML:
```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
```

---

## ⚠️ Error Handling

### Common Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Already registered for this event",
  "registrationId": 456,
  "paymentStatus": "paid"
}
```

**400 Validation Error:**
```json
{
  "success": false,
  "errors": [
    {
      "type": "field",
      "msg": "Phone number is required",
      "path": "phone",
      "location": "body"
    }
  ]
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Event not found or not accessible"
}
```

**500 Server Error:**
```json
{
  "success": false,
  "message": "Payment gateway is not configured. Please contact administrator."
}
```

---

## 📝 Implementation Checklist

### Frontend Requirements:

- [ ] Include Razorpay Checkout script
- [ ] Create registration form with all required fields
- [ ] **Add photo upload field (file input)**
- [ ] Implement city dropdown
- [ ] Implement association dropdown (filtered by city)
- [ ] Handle member creation/retrieval
- [ ] Handle file upload (multipart/form-data)
- [ ] Display uploaded photo preview
- [ ] Handle payment flow for paid events
- [ ] Handle free events (skip payment)
- [ ] Display QR code after successful registration
- [ ] Display profile image after successful registration
- [ ] Check registration status before allowing registration
- [ ] Handle duplicate registration errors
- [ ] Display validation errors

### Backend Requirements:

- [x] Public endpoints (no authentication)
- [x] Auto member creation/retrieval
- [x] Duplicate prevention
- [x] Payment integration
- [x] QR code generation
- [x] Free event handling
- [x] Association filtering by city

---

## 🔄 Complete Registration Flow Diagram

```
User visits event page
    ↓
Check registration status (GET /api/public/events/:id/check-registration)
    ↓
Already registered? → Show QR code and details
    ↓
Not registered
    ↓
User fills registration form
    ↓
Get associations by city (GET /api/public/associations?city=XXX)
    ↓
Initiate registration (POST /api/public/events/:id/register-payment)
    ↓
Free event? → Registration complete, show QR code
    ↓
Paid event
    ↓
Member created/retrieved
    ↓
Razorpay order created
    ↓
Open Razorpay Checkout
    ↓
User completes payment
    ↓
Confirm payment (POST /api/public/events/:id/confirm-payment)
    ↓
Payment verified
    ↓
Registration created
    ↓
QR code generated
    ↓
Success! Show QR code and registration details
```

---

## 📞 Support

For issues or questions:
1. Check error messages in API responses
2. Verify all required fields are provided
3. Verify association exists for selected city
4. Check Razorpay configuration in backend
5. Verify event is active and public
6. Contact backend team for assistance

---

## 🎯 Testing

### Test Cases:

1. **New Member Registration (Free Event)**
   - Submit registration form
   - Member created automatically
   - Registration created immediately
   - QR code returned

2. **Existing Member Registration (Paid Event)**
   - Submit registration with existing phone
   - Existing member retrieved
   - Payment initiated
   - Payment completed
   - Registration created
   - QR code generated

3. **Duplicate Registration**
   - Try to register twice
   - Error returned: "Already registered"

4. **Invalid Association**
   - Submit invalid associationId
   - Error returned: "Association not found"

5. **Payment Failure**
   - Invalid payment signature
   - Error returned: "Invalid payment signature"

---

**Last Updated**: November 2025

