# Web Frontend Event Registration API Documentation

## Overview

This document describes the API endpoints for event registration in the web frontend. These endpoints allow web users (admin/sub-admin/user) to register for events with payment support using Razorpay.

## Base URL
- **Development**: `http://localhost:5000/api`
- **Production**: `https://mandapam-backend-97mi.onrender.com/api`

## Authentication

All endpoints require Bearer Token authentication:
```
Authorization: Bearer <JWT_TOKEN>
```

---

## 🔐 Registration Flow

### 1. Initiate Payment Registration

**Endpoint**: `POST /api/events/:id/register-payment`  
**Access**: Private (Web users)

Creates a Razorpay order for event registration. Returns payment options ready for Razorpay Checkout integration.

#### Request Parameters

**URL Parameters:**
- `id` (integer, required): Event ID

**Request Body:**
```json
{
  "memberId": 123  // Optional: For admin users registering someone else
}
```

**Note**: 
- Regular users: Omit `memberId` - system will find member by user's phone number
- Admin users: Can provide `memberId` to register on behalf of another member

#### Response

**Success (200 or 201):**
```json
{
  "success": true,
  "isFree": false,
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
    "name": "Event Title",
    "description": "Event Registration Fee - Event Title",
    "order_id": "order_RamtONiHbf6jBR",
    "prefill": {
      "name": "Member Name",
      "email": "member@example.com",
      "contact": "9876543210"
    },
    "theme": {
      "color": "#2563eb"
    },
    "notes": {
      "eventId": "32",
      "memberId": "123",
      "eventName": "Event Title"
    }
  }
}
```

**Free Event (200):**
```json
{
  "success": true,
  "isFree": true,
  "message": "This event is free. Please use the RSVP endpoint to register.",
  "event": {
    "id": 32,
    "title": "Free Event",
    "registrationFee": 0
  }
}
```

**Error Responses:**

- **400**: Invalid event ID, already registered, or missing phone number
- **404**: Event not found, member not found
- **500**: Payment gateway not configured or server error

#### Frontend Implementation Example

```javascript
// Step 1: Initiate payment
const initiatePayment = async (eventId, memberId = null) => {
  try {
    const response = await fetch(`/api/events/${eventId}/register-payment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ memberId })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message);
    }
    
    // Free event - handle separately
    if (data.isFree) {
      console.log('Event is free, use RSVP endpoint');
      return { isFree: true };
    }
    
    // Paid event - proceed with Razorpay
    return {
      isFree: false,
      order: data.order,
      paymentOptions: data.paymentOptions
    };
  } catch (error) {
    console.error('Payment initiation error:', error);
    throw error;
  }
};

// Step 2: Open Razorpay Checkout
const openRazorpayCheckout = (paymentOptions) => {
  const options = {
    ...paymentOptions,
    handler: async function (response) {
      // Handle payment success
      await confirmPayment(response);
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

// Step 3: Confirm payment
const confirmPayment = async (razorpayResponse, eventId, memberId = null) => {
  try {
    const response = await fetch(`/api/events/${eventId}/confirm-payment`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        razorpay_order_id: razorpayResponse.razorpay_order_id,
        razorpay_payment_id: razorpayResponse.razorpay_payment_id,
        razorpay_signature: razorpayResponse.razorpay_signature,
        memberId
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message);
    }
    
    // Registration successful
    console.log('Registration confirmed:', data);
    return data;
  } catch (error) {
    console.error('Payment confirmation error:', error);
    throw error;
  }
};

// Complete flow
const registerForEvent = async (eventId, memberId = null) => {
  try {
    // 1. Initiate payment
    const paymentData = await initiatePayment(eventId, memberId);
    
    if (paymentData.isFree) {
      // Handle free event registration
      return;
    }
    
    // 2. Open Razorpay Checkout
    openRazorpayCheckout(paymentData.paymentOptions);
    
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

### 2. Confirm Payment and Complete Registration

**Endpoint**: `POST /api/events/:id/confirm-payment`  
**Access**: Private (Web users)

Verifies Razorpay payment signature and creates/updates event registration.

#### Request Parameters

**URL Parameters:**
- `id` (integer, required): Event ID

**Request Body:**
```json
{
  "razorpay_order_id": "order_RamtONiHbf6jBR",
  "razorpay_payment_id": "pay_RamtONiHbf6jBR",
  "razorpay_signature": "signature_hash",
  "notes": "Optional notes",
  "memberId": 123  // Optional: For admin users
}
```

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
    "amountPaid": "1000.00"
  }
}
```

**Error Responses:**

- **400**: Invalid payment signature, payment details missing, or free event
- **404**: Event not found, member not found
- **500**: Server error

---

### 3. Check Registration Status

**Endpoint**: `GET /api/events/:id/my-registration`  
**Access**: Private (Web users)

Check if current user (or specified member) is registered for an event.

#### Request Parameters

**URL Parameters:**
- `id` (integer, required): Event ID

**Query Parameters:**
- `memberId` (integer, optional): For admin users to check another member's registration

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
    "title": "Event Title",
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

---

### 4. Get My Registrations

**Endpoint**: `GET /api/events/my/registrations`  
**Access**: Private (Web users)

Get all event registrations for the current user.

#### Response

**Success (200):**
```json
{
  "success": true,
  "registrations": [
    {
      "id": 456,
      "event": {
        "id": 32,
        "title": "Event Title",
        "description": "Event Description",
        "startDate": "2025-01-06T00:00:00.000Z",
        "endDate": "2025-01-08T00:00:00.000Z",
        "registrationFee": 1000,
        "currentAttendees": 100,
        "maxAttendees": 500,
        "status": "Upcoming",
        "exhibitors": [
          {
            "id": 1,
            "name": "Exhibitor Name",
            "businessCategory": "Flower Decoration"
          }
        ]
      },
      "status": "registered",
      "paymentStatus": "paid",
      "amountPaid": "1000.00",
      "registeredAt": "2025-11-02T17:10:12.774Z",
      "attendedAt": null,
      "qrDataURL": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
    }
  ]
}
```

**No Phone Number (200):**
```json
{
  "success": true,
  "registrations": [],
  "message": "No phone number in profile. Cannot fetch registrations."
}
```

---

## 🔑 Key Features

### 1. **Member Linking**
- Web users are linked to members via phone number matching
- User profile must have a phone number to register
- Admin users can register on behalf of any member by providing `memberId`

### 2. **Payment Flow**
- Supports Razorpay payment gateway
- Handles free events gracefully
- Returns pre-configured payment options for frontend

### 3. **QR Code Generation**
- QR codes are generated on-the-fly (not stored)
- Contains registration details for check-in
- Available immediately after payment confirmation

### 4. **Registration Status**
- Check registration status before initiating payment
- View all registrations with QR codes
- Admin can check any member's registration status

---

## ⚠️ Error Handling

### Common Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Already registered and paid for this event"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Not authorized, no token"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Member profile not found. Please ensure your phone number matches a member record.",
  "suggestion": "Contact administrator to link your user account with a member profile"
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

- [ ] Include Razorpay Checkout script (`https://checkout.razorpay.com/v1/checkout.js`)
- [ ] Store authentication token in localStorage/sessionStorage
- [ ] Handle payment initiation flow
- [ ] Handle Razorpay Checkout success callback
- [ ] Handle Razorpay Checkout error/cancel
- [ ] Display QR code after successful registration
- [ ] Show registration status before allowing registration
- [ ] Handle free events (skip payment flow)
- [ ] Display user's registrations list
- [ ] Handle admin registration for other members (if admin role)

### Backend Requirements:

- [x] Payment service configured
- [x] QR code generation service
- [x] Member linking by phone number
- [x] Admin registration support
- [x] Free event handling
- [x] Payment verification
- [x] Registration status tracking

---

## 🔄 Complete Registration Flow Diagram

```
User clicks "Register" 
    ↓
Check registration status (GET /api/events/:id/my-registration)
    ↓
Already registered? → Show QR code and details
    ↓
Not registered
    ↓
Initiate payment (POST /api/events/:id/register-payment)
    ↓
Free event? → Use RSVP endpoint (separate flow)
    ↓
Paid event
    ↓
Open Razorpay Checkout with paymentOptions
    ↓
User completes payment
    ↓
Razorpay handler callback
    ↓
Confirm payment (POST /api/events/:id/confirm-payment)
    ↓
Success → Display QR code and registration details
```

---

## 📞 Support

For issues or questions:
1. Check error messages in API responses
2. Verify user has phone number in profile
3. Verify member record exists with matching phone number
4. Check Razorpay configuration in environment variables
5. Contact backend team for assistance

---

## 🎯 Testing

### Test Cases:

1. **Self Registration (Regular User)**
   - User with phone number registers for event
   - Payment flow completes successfully
   - QR code generated

2. **Admin Registration for Member**
   - Admin user provides memberId
   - Registration completes for specified member
   - QR code generated

3. **Free Event**
   - Initiate payment returns `isFree: true`
   - Skip payment flow

4. **Already Registered**
   - Registration status check returns `isRegistered: true`
   - Payment initiation returns error

5. **No Phone Number**
   - Registration returns error about missing phone number

6. **Member Not Found**
   - Registration returns error about member profile not found

---

**Last Updated**: November 2025

