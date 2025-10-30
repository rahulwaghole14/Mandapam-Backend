# Admin Events APIs

All Admin endpoints require Authorization header with an admin JWT:

- Authorization: Bearer <admin_jwt>
- Base URL: http://<host>:<port>

## List Event Registrations
- Method: GET
- Path: /api/events/:id/registrations
- Description: Returns registrations for an event with member details and payment/attendance info.

Query Params: none

Response 200
```
{
  "success": true,
  "registrations": [
    {
      "memberId": 8866,
      "name": "John Doe",
      "phone": "9876543210",
      "amountPaid": 499.00,
      "paymentStatus": "paid",
      "status": "registered",
      "registeredAt": "2025-10-30T12:47:33.124Z",
      "attendedAt": null
    }
  ]
}
```

Errors
- 404: { success: false, message: "Event not found" }
- 500: { success: false, message: "Server error while fetching registrations" }

Curl
```
curl -H "Authorization: Bearer <ADMIN_TOKEN>" \
  http://localhost:5000/api/events/29/registrations
```

## Check-in by QR (Attendance)
- Method: POST
- Path: /api/events/checkin
- Description: Marks attendance using a QR token scanned at the gate.

Body
```
{
  "qrToken": "EVT:<base64url({data,sig})>"
}
```

Response 200 (idempotent)
```
{
  "success": true,
  "message": "Check-in successful",
  "attendedAt": "2025-10-30T13:05:00.000Z"
}
```

Errors
- 400: { success: false, message: "Invalid QR token" }
- 404: { success: false, message: "Registration not found" }
- 500: { success: false, message: "Server error during check-in" }

Curl
```
curl -X POST -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"qrToken":"EVT:..."}' \
  http://localhost:5000/api/events/checkin
```

## Exhibitors: Create
- Method: POST
- Path: /api/events/:eventId/exhibitors
- Description: Add an exhibitor to an event.

Body
```
{
  "name": "Acme Booth",
  "logo": "https://.../logo.png",   // optional
  "description": "Best products",    // optional
  "phone": "9999999999"              // optional
}
```

Response 201
```
{
  "success": true,
  "exhibitor": {
    "id": 12,
    "eventId": 29,
    "name": "Acme Booth",
    "logo": null,
    "description": "Best products",
    "phone": "9999999999",
    "created_at": "...",
    "updated_at": "..."
  }
}
```

Errors
- 404: { success: false, message: "Event not found" }
- 400: validation errors
- 500: server error

Curl
```
curl -X POST -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Booth","phone":"9999999999"}' \
  http://localhost:5000/api/events/29/exhibitors
```

## Exhibitors: List
- Method: GET
- Path: /api/events/:eventId/exhibitors
- Description: List all exhibitors for an event (public).

Response 200
```
{
  "success": true,
  "exhibitors": [
    { "id":12, "eventId":29, "name":"Acme Booth", "logo":null, "description":"Best products", "phone":"9999999999" }
  ]
}
```

Curl
```
curl http://localhost:5000/api/events/29/exhibitors
```

## Exhibitors: Update
- Method: PUT
- Path: /api/events/:eventId/exhibitors/:exhibitorId
- Description: Update exhibitor details.

Body (any subset)
```
{
  "name": "Acme Booth Updated",
  "logo": "https://...",
  "description": "Updated",
  "phone": "8888888888"
}
```

Response 200
```
{
  "success": true,
  "exhibitor": { /* updated exhibitor */ }
}
```

Errors
- 404: { success: false, message: "Exhibitor not found" }
- 500: server error

Curl
```
curl -X PUT -H "Authorization: Bearer <ADMIN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Booth Updated"}' \
  http://localhost:5000/api/events/29/exhibitors/12
```

## Exhibitors: Delete
- Method: DELETE
- Path: /api/events/:eventId/exhibitors/:exhibitorId
- Description: Delete an exhibitor.

Response 200
```
{ "success": true, "message": "Exhibitor deleted" }
```

Errors
- 404: { success: false, message: "Exhibitor not found" }
- 500: server error

Curl
```
curl -X DELETE -H "Authorization: Bearer <ADMIN_TOKEN>" \
  http://localhost:5000/api/events/29/exhibitors/12
```

## Notes
- QR token format: base64url-encoded JSON `{ data: { r, e, m, t }, sig }` wrapped as `EVT:<token>`. Generated on the fly when a member registers.
- Attendance check-in is idempotent; re-scanning returns "Already checked-in" with the timestamp.
- Event images are handled via multipart on create/update; see existing Event APIs for image handling specifics.
