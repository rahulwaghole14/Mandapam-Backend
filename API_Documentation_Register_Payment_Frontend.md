# Register Payment API - Frontend Integration Guide

## Overview

This document provides **clear, actionable guidance** for frontend developers integrating with the `POST /api/public/events/:id/register-payment` endpoint.

## Base URL

- **Production**: `https://mandapam-backend-97mi.onrender.com/api/public`
- **Development**: `http://localhost:5000/api/public`

---

## Endpoint Details

**Endpoint**: `POST /api/public/events/:id/register-payment`  
**Authentication**: None required (Public endpoint)  
**Content-Type**: `application/json` (Recommended)

---

## Request Format

### URL Parameters

- `id` (integer, required): Event ID

### Request Body (JSON)

```json
{
  "name": "Bhagayshri Parkale",
  "phone": "9604253122",
  "email": "parkalebg96@gmail.com",
  "businessName": "Yashoda",
  "businessType": "catering",
  "city": "Pune",
  "associationId": "65",
  "photo": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/photo.jpg"
}
```

### Field Specifications

| Field | Type | Required | Format | Notes |
|-------|------|----------|--------|-------|
| `name` | string | ✅ Yes | 2-100 characters | Full name |
| `phone` | string | ✅ Yes | Exactly 10 digits | Must be unique |
| `email` | string | ✅ Yes | Valid email format | Will be normalized |
| `businessName` | string | ✅ Yes | 2-200 characters | Business name |
| `businessType` | string | ✅ Yes | Enum value | See allowed values below |
| `city` | string | ✅ Yes | Non-empty string | City name |
| `associationId` | string/integer | ✅ Yes | Positive integer | Can be string "65" or number 65 |
| `photo` | string | ❌ No | Cloudinary URL | Must be valid HTTP/HTTPS URL if provided |

### Business Type Values

Allowed values for `businessType`:
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

---

## Frontend Implementation Examples

### ✅ Recommended: Using Axios with JSON

```javascript
import axios from 'axios';

const registerPayment = async (eventId, formData) => {
  try {
    const response = await axios.post(
      `https://mandapam-backend-97mi.onrender.com/api/public/events/${eventId}/register-payment`,
      {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        businessName: formData.businessName,
        businessType: formData.businessType,
        city: formData.city,
        associationId: formData.associationId.toString(), // Can be string or number
        photo: formData.photo || undefined // Optional Cloudinary URL
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Registration error:', error.response?.data || error.message);
    throw error;
  }
};

// Usage
const result = await registerPayment(33, {
  name: "Bhagayshri Parkale",
  phone: "9604253122",
  email: "parkalebg96@gmail.com",
  businessName: "Yashoda",
  businessType: "catering",
  city: "Pune",
  associationId: "65",
  photo: "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/photo.jpg"
});
```

### ✅ Using Fetch API

```javascript
const registerPayment = async (eventId, formData) => {
  try {
    const response = await fetch(
      `https://mandapam-backend-97mi.onrender.com/api/public/events/${eventId}/register-payment`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          businessName: formData.businessName,
          businessType: formData.businessType,
          city: formData.city,
          associationId: formData.associationId.toString(),
          photo: formData.photo || undefined
        })
      }
    );
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }
    
    return data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};
```

### ⚠️ Form-URLEncoded (Not Recommended, but Supported)

If you must use `application/x-www-form-urlencoded`, ensure data is properly serialized:

```javascript
import axios from 'axios';

const registerPayment = async (eventId, formData) => {
  const params = new URLSearchParams();
  params.append('name', formData.name);
  params.append('phone', formData.phone);
  params.append('email', formData.email);
  params.append('businessName', formData.businessName);
  params.append('businessType', formData.businessType);
  params.append('city', formData.city);
  params.append('associationId', formData.associationId.toString());
  if (formData.photo) {
    params.append('photo', formData.photo);
  }

  const response = await axios.post(
    `https://mandapam-backend-97mi.onrender.com/api/public/events/${eventId}/register-payment`,
    params,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );
  
  return response.data;
};
```

---

## Response Format

### Success Response - Free Event (201)

```json
{
  "success": true,
  "isFree": true,
  "message": "Registration successful (free event)",
  "member": {
    "id": 123,
    "name": "Bhagayshri Parkale",
    "phone": "9604253122",
    "isNew": true,
    "profileImageURL": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/photo.jpg"
  },
  "registration": {
    "id": 456,
    "eventId": 33,
    "memberId": 123,
    "status": "registered",
    "paymentStatus": "free"
  },
  "qrDataURL": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}
```

### Success Response - Paid Event (201)

```json
{
  "success": true,
  "isFree": false,
  "message": "Member created/retrieved. Payment required.",
  "member": {
    "id": 123,
    "name": "Bhagayshri Parkale",
    "phone": "9604253122",
    "isNew": true,
    "profileImageURL": "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/photo.jpg"
  },
  "order": {
    "id": "order_RamtONiHbf6jBR",
    "entity": "order",
    "amount": 100000,
    "amount_paid": 0,
    "amount_due": 100000,
    "currency": "INR",
    "receipt": "evt_33_mem_123_1234567890",
    "status": "created",
    "created_at": 1234567890
  },
  "keyId": "rzp_test_RQ5ITAzm7AyNN9",
  "paymentOptions": {
    "key": "rzp_test_RQ5ITAzm7AyNN9",
    "amount": 100000,
    "currency": "INR",
    "name": "Event Name",
    "description": "Event Registration Fee - Event Name",
    "order_id": "order_RamtONiHbf6jBR",
    "prefill": {
      "name": "Bhagayshri Parkale",
      "email": "parkalebg96@gmail.com",
      "contact": "9604253122"
    },
    "theme": {
      "color": "#2563eb"
    },
    "notes": {
      "eventId": "33",
      "memberId": "123",
      "eventName": "Event Name"
    }
  }
}
```

### Error Response - Validation Failed (400)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "type": "field",
      "msg": "Name is required",
      "path": "name",
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

### Error Response - Empty Body (400)

```json
{
  "success": false,
  "message": "Request body is empty. Please ensure data is being sent correctly.",
  "contentType": "application/x-www-form-urlencoded",
  "hint": "If using form-urlencoded, ensure data is properly serialized. If using JSON, set Content-Type to application/json."
}
```

### Error Response - Already Registered (400)

```json
{
  "success": false,
  "message": "Already registered for this event",
  "registrationId": 456,
  "paymentStatus": "paid"
}
```

### Error Response - Event Not Found (404)

```json
{
  "success": false,
  "message": "Event not found or not accessible"
}
```

### Error Response - Past Event (400)

```json
{
  "success": false,
  "message": "Cannot register for past or completed events"
}
```

---

## Common Issues & Solutions

### ❌ Issue: 400 Bad Request - Empty Body

**Symptom**: 
```json
{
  "message": "Request failed with status code 400",
  "config": {
    "headers": {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    "data": {}
  }
}
```

**Cause**: Request body is not being sent properly.

**Solution**: 
1. **Use JSON format** (recommended):
   ```javascript
   headers: {
     'Content-Type': 'application/json'
   },
   body: JSON.stringify(data)
   ```

2. **If using form-urlencoded**, ensure proper serialization:
   ```javascript
   const params = new URLSearchParams();
   params.append('name', data.name);
   // ... etc
   ```

### ❌ Issue: Validation Errors

**Symptom**: 
```json
{
  "success": false,
  "errors": [
    {
      "msg": "Association ID must be a valid positive integer",
      "path": "associationId"
    }
  ]
}
```

**Solution**: 
- `associationId` can be sent as string `"65"` or number `65` - both are accepted
- Ensure all required fields are present
- Check field formats (phone must be exactly 10 digits, email must be valid)

### ❌ Issue: CORS Errors

**Symptom**: CORS policy errors in browser console

**Solution**: 
- The backend already has CORS configured for `mandap-web-frontend-new.onrender.com`
- If you're testing locally, ensure your origin is in the allowed list
- Check that you're using the correct base URL

---

## Complete Integration Example

```javascript
// Complete registration flow with error handling
const handleEventRegistration = async (eventId, formData) => {
  try {
    // Step 1: Initiate registration
    const registrationResponse = await axios.post(
      `https://mandapam-backend-97mi.onrender.com/api/public/events/${eventId}/register-payment`,
      {
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        businessName: formData.businessName,
        businessType: formData.businessType,
        city: formData.city,
        associationId: formData.associationId.toString(),
        photo: formData.photo || undefined
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const { data } = registrationResponse;

    // Step 2: Handle free event
    if (data.isFree) {
      return {
        success: true,
        registration: data.registration,
        qrCode: data.qrDataURL,
        member: data.member
      };
    }

    // Step 3: Handle paid event - Initialize Razorpay
    const options = data.paymentOptions;
    
    const razorpay = new Razorpay({
      key: data.keyId,
      amount: options.amount,
      currency: options.currency,
      name: options.name,
      description: options.description,
      order_id: options.order_id,
      prefill: options.prefill,
      theme: options.theme,
      handler: async function (response) {
        // Step 4: Confirm payment
        try {
          const confirmResponse = await axios.post(
            `https://mandapam-backend-97mi.onrender.com/api/public/events/${eventId}/confirm-payment`,
            {
              memberId: data.member.id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            },
            {
              headers: {
                'Content-Type': 'application/json'
              }
            }
          );

          return {
            success: true,
            registration: confirmResponse.data.registration,
            qrCode: confirmResponse.data.qrDataURL,
            member: confirmResponse.data.member
          };
        } catch (error) {
          console.error('Payment confirmation error:', error.response?.data);
          throw error;
        }
      },
      modal: {
        ondismiss: function() {
          console.log('Payment cancelled');
        }
      }
    });

    razorpay.open();

  } catch (error) {
    if (error.response) {
      // Server responded with error
      const errorData = error.response.data;
      
      if (errorData.errors) {
        // Validation errors
        const errorMessages = errorData.errors.map(err => err.msg).join(', ');
        throw new Error(`Validation failed: ${errorMessages}`);
      } else {
        // Other errors
        throw new Error(errorData.message || 'Registration failed');
      }
    } else {
      // Network or other errors
      throw new Error(error.message || 'Network error');
    }
  }
};
```

---

## Testing Checklist

- [ ] All required fields are included in request
- [ ] `Content-Type: application/json` header is set
- [ ] Request body is properly serialized (not empty)
- [ ] `associationId` is sent (can be string or number)
- [ ] Phone number is exactly 10 digits
- [ ] Email is in valid format
- [ ] `businessType` is one of the allowed values
- [ ] Error handling is implemented
- [ ] Success response is handled correctly
- [ ] Payment flow (for paid events) is implemented

---

## Support

If you encounter issues:

1. Check the error response - it contains detailed validation errors
2. Verify request format matches examples above
3. Ensure `Content-Type` header is set correctly
4. Check server logs (if accessible) for detailed request information
5. Contact backend team with:
   - Request payload
   - Response error details
   - Browser console errors (if any)

---

## Version

**Last Updated**: 2025-01-27  
**API Version**: 1.0.0  
**Endpoint**: `POST /api/public/events/:id/register-payment`


