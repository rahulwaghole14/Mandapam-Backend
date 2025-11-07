# Frontend Integration API Guide

Last updated: 2025-01-27

This document aggregates the most relevant backend endpoints for the web and public frontends. It highlights authentication requirements, request/response formats, and common workflows so the frontend team has a single reference.

---

## Base URLs

| Environment | API Base URL |
|-------------|--------------|
| Development | `http://localhost:5000/api` |
| Staging / Render | `https://mandapam-backend-97mi.onrender.com/api` |

All examples below assume the base URL is appended.

---

## Authentication

- **JWT Bearer token** for all private routes (web dashboard, admin, manager, sub-admin, user).
- Public registration routes (`/api/public/...`) do **not** require auth.
- Mobile app routes (`/api/mobile/...`) expect mobile JWT tokens (OTP-based login flow).

**Headers**

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

---

## Role Matrix (Web Dashboard)

| Role | Description | Scope |
|------|-------------|-------|
| `admin` | Full access | All districts |
| `manager` | Operational manager | District-scoped (same restrictions as sub-admin) |
| `sub-admin` | District representative | District-scoped |
| `user` | Read-only staff | Limited read operations |

District-scoped roles can only manipulate resources within their assigned `district`.

---

## Key API Categories

### 1. Authentication & Users

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/auth/login` | POST | Public | Email/password login. Returns JWT, user info, permissions. |
| `/auth/profile` | GET | Private | Fetch logged-in user profile. |
| `/auth/profile` | PUT | Private | Update profile details (name, phone, district, state, photo). |
| `/auth/password` | PUT | Private | Change password (requires current password). |
| `/auth/users` | POST | Admin | Create user (`role` ∈ `admin`, `manager`, `sub-admin`). |
| `/auth/users/:id` | PUT | Admin | Update user (role, permissions, status). |
| `/auth/users/:id` | DELETE | Admin | Soft delete user (cannot delete self). |

**Login Response Example**

```json
{
  "success": true,
  "token": "<jwt>",
  "user": {
    "id": 12,
    "name": "Jane Manager",
    "email": "jane@mandap.com",
    "role": "manager",
    "district": "Pune",
    "state": "Maharashtra",
    "permissions": {
      "events": { "read": true, "write": true, "delete": false },
      "vendors": { "read": true, "write": true, "delete": false }
    }
  }
}
```

---

### 2. Events (Web Dashboard)

| Endpoint | Method | Roles | Notes |
|----------|--------|-------|-------|
| `/events` | GET | All authenticated | Supports filters (status, date range, district, search). |
| `/events/:id` | GET | All authenticated | Detailed event info, exhibitors, stats. |
| `/events` | POST | Admin/Manager/Sub-admin | Create event (respect district restrictions). |
| `/events/:id` | PUT | Admin/Manager/Sub-admin | Update event (district guard applies). |
| `/events/:id/status` | PUT | Admin/Manager/Sub-admin | Activate/deactivate event. |
| `/events/:id/register-payment` | POST | Authenticated web users | Initiate Razorpay order (web flow). |
| `/events/:id/confirm-payment` | POST | Authenticated web users | Confirm payment, generate QR. |

**Create Event Request (JSON)**

```json
{
  "title": "Business Summit",
  "description": "Two-day expo",
  "startDate": "2025-02-10T10:00:00Z",
  "endDate": "2025-02-11T18:00:00Z",
  "district": "Pune",
  "state": "Maharashtra",
  "venue": "Mandap Convention Center",
  "registrationFee": 1500,
  "maxAttendees": 300,
  "isPublic": true
}
```

**District Guard**: Admin bypasses; managers/sub-admins must match event district.

---

### 3. Vendors

| Endpoint | Method | Roles | Description |
|----------|--------|-------|-------------|
| `/vendors` | GET | All auth | Filters: `category`, `city`, `status`, pagination. |
| `/vendors/:id` | GET | All auth | Vendor detail. |
| `/vendors` | POST | Admin/Manager/Sub-admin | Create vendor (district guard for non-admin). |
| `/vendors/:id` | PUT | Admin/Manager/Sub-admin | Update vendor details, attachments. |
| `/vendors/:id/verify` | POST | Admin/Manager/Sub-admin | Toggle verification. |
| `/vendors/:id` | DELETE | Admin/Manager/Sub-admin | Soft delete vendor. |

---

### 4. Associations

| Endpoint | Method | Roles | Description |
|----------|--------|-------|-------------|
| `/associations` | GET | All auth | List associations (filters by city/state). |
| `/associations/:id` | GET | All auth | Detail view. |
| `/associations` | POST | Admin/Manager/Sub-admin | Create association. |
| `/associations/:id` | PUT | Admin/Manager/Sub-admin | Update association. |
| `/associations/:id` | DELETE | Admin/Manager/Sub-admin | Remove association. |
| `/associations/:id/toggle-status` | PATCH | Admin/Manager/Sub-admin | Activate/deactivate. |

---

### 5. Dashboard / Analytics

| Endpoint | Method | Roles | Purpose |
|----------|--------|-------|---------|
| `/dashboard/overview` | GET | All auth | Summary metrics (members, events, revenue). |
| `/dashboard/events` | GET | All auth | Event stats, trends. |
| `/dashboard/members` | GET | All auth | Member distribution. |
| `/dashboard/vendors` | GET | All auth | Vendor stats. |
| `/dashboard/associations` | GET | All auth | Association metrics. |

Responses automatically scope to the caller’s district for managers/sub-admins.

---

### 6. Public Event Registration (No Auth)

**Flow**: Register & Pay → Confirm Payment → QR Code

| Step | Endpoint | Method | Description |
|------|----------|--------|-------------|
| 1 | `/public/events/:id/register-payment` | POST | Create/find member, initiate payment (supports Cloudinary photo URL). |
| 2 | `/public/events/:id/confirm-payment` | POST | Verify Razorpay payment signature and finalize registration. |
| 3 | `/public/events/:id/status` | GET | Optional: check registration status by phone/email. |

**Register Payment (JSON)**

```json
{
  "name": "Bhagayshri Parkale",
  "phone": "9604253122",
  "email": "parkalebg96@gmail.com",
  "businessName": "Yashoda",
  "businessType": "catering",
  "city": "Pune",
  "associationId": "65",
  "photo": "https://res.cloudinary.com/.../profile.jpg"
}
```

- Accepts `associationId` as string or number.
- For free events: response returns registration + QR immediately.
- Paid events: returns Razorpay `order`, `keyId`, and `paymentOptions`.

**Confirm Payment**

```json
{
  "memberId": 123,
  "razorpay_order_id": "order_XYZ",
  "razorpay_payment_id": "pay_ABC",
  "razorpay_signature": "signature_hash",
  "notes": "Optional notes"
}
```

Response includes registration details and QR code (`qrDataURL`).

---

### 7. Mobile App (for reference)

| Endpoint | Method | Notes |
|----------|--------|-------|
| `/mobile/auth/send-otp` | POST | Initiate OTP login. |
| `/mobile/auth/verify-otp` | POST | Verify OTP, returns JWT. |
| `/mobile/events` | GET | Upcoming events feed. |
| `/mobile/events/:id/register-payment` | POST | Mobile Razorpay initiation. |
| `/mobile/events/:id/confirm-payment` | POST | Confirm payment, create registration. |
| `/mobile/members` | GET | Member directory (search, filters). |

Frontends should keep mobile/web flows separate; tokens are not interchangeable.

---

## Error Handling Conventions

- Validation errors return HTTP 400 with `errors` array (express-validator format).
- Auth failures return HTTP 401; authorization failures return 403 with message including role.
- Not found resources return 404 with `message` field.
- Server issues return 500 with generic message (stack only in `NODE_ENV=development`).

Example validation error:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
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

## Deployment Notes

- When adding roles (e.g., `manager`), run `node scripts/add-manager-role.js` in each environment before deploying dependent code.
- Ensure Razorpay keys (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) are configured for payment endpoints.
- Public routes accept `application/json` or properly serialized `application/x-www-form-urlencoded`. Prefer JSON.

---

## Contact & Support

For backend assistance:
- Share failing request/response samples (including headers and payload).
- Provide console/network logs if the issue is on the frontend.
- Escalate to backend team via Slack channel `#mandap-backend` or open a GitHub issue when appropriate.
