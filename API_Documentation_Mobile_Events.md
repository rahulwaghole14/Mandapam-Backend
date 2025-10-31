# Mobile Events APIs

All Mobile endpoints require Authorization header with a member JWT (obtained via OTP login):

- Authorization: Bearer <member_access_token>
- Base URL: http://<host>:<port>

**Note:** The existing `/api/mobile/events/:id/rsvp` endpoint still works for free events. For paid events, use the payment flow endpoints below.

---

## Get Event Details (Updated)

- **Method:** GET
- **Path:** `/api/mobile/events/:id`
- **Access:** Public (no auth required)
- **Description:** Get event details including exhibitors

### Response 200
```json
{
  "success": true,
  "event": {
    "id": 29,
    "title": "Tech Workshop 2025",
    "description": "Learn the latest technologies",
    "type": "Workshop",
    "startDate": "2025-11-15T10:00:00.000Z",
    "endDate": "2025-11-15T18:00:00.000Z",
    "address": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "district": "Mumbai",
    "pincode": "400001",
    "registrationFee": 499.00,
    "maxAttendees": 100,
    "currentAttendees": 45,
    "status": "Upcoming",
    "image": "event-image.jpg",
    "exhibitors": [
      {
        "id": 12,
        "eventId": 29,
        "name": "Acme Solutions",
        "logo": "https://example.com/logo.png",
        "description": "Leading tech provider",
        "phone": "9999999999",
        "created_at": "2025-10-30T12:00:00.000Z",
        "updated_at": "2025-10-30T12:00:00.000Z"
      }
    ]
  }
}
```

### Errors
- **400:** `{ "success": false, "message": "Invalid event ID format" }`
- **404:** `{ "success": false, "message": "Event not found" }`
- **500:** `{ "success": false, "message": "Server error while fetching event" }`

### cURL Example
```bash
curl http://localhost:5000/api/mobile/events/29
```

---

## Create Payment Order (For Paid Events)

- **Method:** POST
- **Path:** `/api/mobile/events/:id/register-payment`
- **Access:** Private (member auth required)
- **Description:** Create a Razorpay order for event registration fee payment

### Request Body
None (event ID from URL, member ID from token)

### Response 201
```json
{
  "success": true,
  "order": {
    "id": "order_MABC123XYZ",
    "entity": "order",
    "amount": 49900,
    "amount_paid": 0,
    "amount_due": 49900,
    "currency": "INR",
    "receipt": "evt_29_mem_8866_1698765432123",
    "status": "created",
    "attempts": 0,
    "created_at": 1698765432
  },
  "keyId": "rzp_live_ABC123XYZ"
}
```

**Note:** `amount` is in paise (49900 = ₹499.00). Use `keyId` for Razorpay Checkout.

### Errors
- **400:** `{ "success": false, "message": "This event does not require payment" }`
- **404:** `{ "success": false, "message": "Event not found" }`
- **500:** `{ "success": false, "message": "Server error while creating order" }`

### cURL Example
```bash
curl -X POST \
  -H "Authorization: Bearer <MEMBER_TOKEN>" \
  http://localhost:5000/api/mobile/events/29/register-payment
```

---

## Confirm Payment and Register

- **Method:** POST
- **Path:** `/api/mobile/events/:id/confirm-payment`
- **Access:** Private (member auth required)
- **Description:** Verify Razorpay payment signature and create registration. Returns QR code for event check-in.

### Request Body
```json
{
  "razorpay_order_id": "order_MABC123XYZ",
  "razorpay_payment_id": "pay_MXYZ789ABC",
  "razorpay_signature": "abc123def456...",
  "notes": "Looking forward to the event"  // optional
}
```

### Response 201
```json
{
  "success": true,
  "message": "Registration confirmed",
  "registrationId": 45,
  "qrDataURL": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPQAAAD0CAYAAACsLwv+..."
}
```

**Note:** `qrDataURL` is a base64-encoded PNG image. Display it in an `<img>` tag or Image component.

### Errors
- **400:** 
  - `{ "success": false, "message": "Invalid payment signature" }`
  - Validation errors
- **404:** `{ "success": false, "message": "Event not found" }`
- **500:** `{ "success": false, "message": "Server error while confirming payment" }`

### cURL Example
```bash
curl -X POST \
  -H "Authorization: Bearer <MEMBER_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "razorpay_order_id": "order_MABC123XYZ",
    "razorpay_payment_id": "pay_MXYZ789ABC",
    "razorpay_signature": "abc123def456...",
    "notes": "Looking forward"
  }' \
  http://localhost:5000/api/mobile/events/29/confirm-payment
```

---

## Get My Event Registrations

- **Method:** GET
- **Path:** `/api/mobile/my/events`
- **Access:** Private (member auth required)
- **Description:** Get all registrations for the authenticated member with QR codes and event details (including exhibitors)

### Query Parameters
None

### Response 200
```json
{
  "success": true,
  "registrations": [
    {
      "id": 45,
      "event": {
        "id": 29,
        "title": "Tech Workshop 2025",
        "description": "Learn the latest technologies",
        "startDate": "2025-11-15T10:00:00.000Z",
        "endDate": "2025-11-15T18:00:00.000Z",
        "city": "Mumbai",
        "registrationFee": 499.00,
        "exhibitors": [
          {
            "id": 12,
            "name": "Acme Solutions",
            "logo": "https://example.com/logo.png",
            "description": "Leading tech provider",
            "phone": "9999999999"
          }
        ]
      },
      "status": "registered",
      "paymentStatus": "paid",
      "registeredAt": "2025-10-30T12:47:33.124Z",
      "attendedAt": null,
      "qrDataURL": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPQAAAD0CAYAAACsLwv+..."
    }
  ]
}
```

### Errors
- **500:** `{ "success": false, "message": "Server error while fetching my events" }`

### cURL Example
```bash
curl -H "Authorization: Bearer <MEMBER_TOKEN>" \
  http://localhost:5000/api/mobile/my/events
```

---

## Get QR Code for Registration

- **Method:** GET
- **Path:** `/api/mobile/registrations/:id/qr`
- **Access:** Private (member auth required)
- **Description:** Get QR code data URL for a specific registration (must belong to authenticated member)

### Response 200
```json
{
  "success": true,
  "qrDataURL": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPQAAAD0CAYAAACsLwv+..."
}
```

### Errors
- **404:** `{ "success": false, "message": "Registration not found" }`
- **500:** `{ "success": false, "message": "Server error while generating QR" }`

### cURL Example
```bash
curl -H "Authorization: Bearer <MEMBER_TOKEN>" \
  http://localhost:5000/api/mobile/registrations/45/qr
```

---

## Payment Flow Workflow

For events with `registrationFee > 0`, follow this flow:

1. **Check Event Fee:**
   - Call `GET /api/mobile/events/:id` to check `registrationFee`

2. **Create Order:**
   - Call `POST /api/mobile/events/:id/register-payment`
   - Get `order.id` and `keyId`

3. **Razorpay Checkout:**
   - Use Razorpay Checkout SDK with `order.id` and `keyId`
   - User completes payment on Razorpay gateway

4. **Confirm Registration:**
   - After successful payment, Razorpay returns:
     - `razorpay_order_id`
     - `razorpay_payment_id`
     - `razorpay_signature`
   - Call `POST /api/mobile/events/:id/confirm-payment` with these values
   - Receive `registrationId` and `qrDataURL`

5. **Display QR:**
   - Show the `qrDataURL` image to the user for event check-in

### For Free Events (registrationFee = 0)
- Continue using the existing `POST /api/mobile/events/:id/rsvp` endpoint
- For QR code, use `GET /api/mobile/registrations/:id/qr` after RSVP

---

## QR Code Usage

QR codes are generated **on-the-fly** (not stored in DB). They contain:
- Registration ID
- Event ID
- Member ID
- Timestamp
- HMAC signature for security

**Display:** Use the `qrDataURL` directly in image components:
- React Native: `<Image source={{ uri: qrDataURL }} />`
- React Web: `<img src={qrDataURL} alt="Event QR" />`
- Flutter: `Image.memory(base64Decode(qrDataURL.split(',')[1]))`

**Check-in:** Admins scan the QR at the event gate using `POST /api/events/checkin`

---

## Status Values

### Registration Status
- `registered` - Successfully registered
- `cancelled` - Registration cancelled
- `attended` - Checked-in at event
- `no_show` - Registered but didn't attend

### Payment Status
- `pending` - Payment not completed
- `paid` - Payment successful
- `failed` - Payment failed
- `refunded` - Payment refunded

---

## Notes

- All QR codes are generated dynamically - no caching needed
- Payment flow requires Razorpay keys configured (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`)
- Event details endpoint now includes `exhibitors` array (backward compatible)
- Registrations are sorted by `registeredAt` DESC (most recent first)

