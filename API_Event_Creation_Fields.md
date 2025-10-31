# Event Creation API - Field Specification

**Endpoint:** `POST /api/events`  
**Authentication:** Required (Bearer token with admin role)

## Quick Reference

### Minimum Required Fields
```json
{
  "title": "Event Name",          // OR use "name" instead
  "startDateTime": "2025-11-01T12:52"  // OR use "startDate" + "startTime"
}
```

### Your Current Request (What Frontend Sends)
```json
{
  "name": "Payment test",                    ✅ Accepted (maps to title)
  "description": "Payment test",             ✅ Accepted
  "startDateTime": "2025-11-01T12:52",      ✅ Accepted
  "endDateTime": "2025-11-03T12:52",        ✅ Accepted
  "startDate": "2025-11-01",                 ⚠️ Redundant (startDateTime already provided)
  "endDate": "2025-11-03",                   ⚠️ Redundant (endDateTime already provided)
  "address": "30/2, prasanna hos soc...",    ✅ Accepted
  "city": "Pune",                            ✅ Accepted
  "state": "Maharashtra",                    ✅ Accepted
  "district": "Pune",                         ✅ Accepted
  "pincode": "411026",                       ✅ Accepted
  "fee": 999.98                              ✅ Accepted (maps to registrationFee)
}
```

**Issue:** Your request is actually correct! The backend should accept it. If you're still getting 400, check the actual error message in the response body.

## Required Fields

| Field Name | Type | Description | Example |
|------------|------|-------------|---------|
| `title` OR `name` | string | Event name/title (minimum 2 characters) | `"Tech Workshop 2025"` |
| `startDate` OR `startDateTime` | string/date | Event start date (required) | `"2025-11-01"` or `"2025-11-01T12:52"` |

## Optional Fields

| Field Name | Type | Description | Validation | Example |
|------------|------|-------------|------------|---------|
| `description` | string | Event description | Max length: TEXT | `"Learn the latest technologies"` |
| `type` | string | Event type | Must be one of: `"Meeting"`, `"Workshop"`, `"Seminar"`, `"Celebration"`, `"Other"` | `"Workshop"` |
| `endDate` OR `endDateTime` | string/date | Event end date | ISO date format | `"2025-11-03"` or `"2025-11-03T12:52"` |
| `startTime` | string | Start time (if using `startDate`) | Format: `HH:MM` (24-hour) | `"10:00"` |
| `endTime` | string | End time (if using `endDate`) | Format: `HH:MM` (24-hour) | `"18:00"` |
| `location` | string | Location/venue name | - | `"Convention Center"` |
| `address` | string | Street address | - | `"123 Main Street"` |
| `city` | string | City name | - | `"Mumbai"` |
| `district` | string | District name | - | `"Mumbai"` |
| `state` | string | State name | - | `"Maharashtra"` |
| `pincode` | string | 6-digit pincode | Must be exactly 6 digits | `"400001"` |
| `registrationFee` OR `fee` | number | Registration fee in rupees | Must be >= 0 | `499.99` |
| `maxAttendees` | integer | Maximum attendees allowed | Must be >= 1 | `100` |
| `contactPerson` | string OR object | Contact person name | - | `"John Doe"` or `{ "name": "John", "phone": "9876543210", "email": "john@example.com" }` |
| `contactPhone` | string | Contact phone number | Format: numbers, +, -, spaces, () | `"9876543210"` |
| `contactEmail` | string | Contact email | Valid email format | `"contact@example.com"` |
| `priority` | string | Event priority | Must be: `"Low"`, `"Medium"`, `"High"`, `"Urgent"` | `"Medium"` |
| `isActive` | boolean | Whether event is active | - | `true` |
| `isPublic` | boolean | Whether event is public | - | `true` |
| `image` | string OR file | Event image (filename or file upload) | File via multipart/form-data | - |

## Field Aliases (Supported for Compatibility)

The backend accepts these alternate field names:

- `name` → maps to `title`
- `fee` → maps to `registrationFee`
- `startDateTime` → parsed into `startDate` + `startTime`
- `endDateTime` → parsed into `endDate` + `endTime`

## Date/Time Format Options

### Option 1: Separate Date and Time
```json
{
  "startDate": "2025-11-01",
  "startTime": "12:52",
  "endDate": "2025-11-03",
  "endTime": "18:00"
}
```

### Option 2: Combined DateTime (Recommended)
```json
{
  "startDateTime": "2025-11-01T12:52",
  "endDateTime": "2025-11-03T18:00"
}
```

**Format:** `YYYY-MM-DDTHH:MM` or full ISO8601

## Complete Request Example

### Using Combined DateTime (Recommended)
```json
{
  "name": "Tech Workshop 2025",
  "description": "Learn the latest technologies",
  "type": "Workshop",
  "startDateTime": "2025-11-01T12:52",
  "endDateTime": "2025-11-03T18:00",
  "address": "123 Main Street",
  "city": "Mumbai",
  "district": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "fee": 499.99,
  "maxAttendees": 100,
  "contactPhone": "9876543210",
  "contactEmail": "contact@example.com",
  "priority": "Medium"
}
```

### Using Separate Date and Time
```json
{
  "title": "Tech Workshop 2025",
  "description": "Learn the latest technologies",
  "type": "Workshop",
  "startDate": "2025-11-01",
  "startTime": "12:52",
  "endDate": "2025-11-03",
  "endTime": "18:00",
  "address": "123 Main Street",
  "city": "Mumbai",
  "district": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "registrationFee": 499.99,
  "maxAttendees": 100,
  "contactPhone": "9876543210",
  "contactEmail": "contact@example.com",
  "priority": "Medium"
}
```

## Validation Rules Summary

1. **Title/Name:** Required, minimum 2 characters
2. **Start Date:** Required (either `startDate` or `startDateTime`)
3. **Type:** Optional, defaults to `"Other"` if not provided
4. **Registration Fee:** Must be >= 0 if provided
5. **Pincode:** Must be exactly 6 digits if provided
6. **Contact Phone:** Only numbers, +, -, spaces, () allowed
7. **Contact Email:** Must be valid email format if provided
8. **Priority:** Must be one of the enum values if provided
9. **Time Format:** HH:MM (24-hour format, e.g., "14:30" not "2:30 PM")

## Common Errors

### Error: "Event title is required"
**Solution:** Include either `title` or `name` field

### Error: "Event start date is required"
**Solution:** Include either `startDate` or `startDateTime` field

### Error: "Invalid pincode"
**Solution:** Pincode must be exactly 6 digits (e.g., "400001")

### Error: "Invalid startDateTime format"
**Solution:** Use format `YYYY-MM-DDTHH:MM` (e.g., "2025-11-01T12:52")

### Error: "Event type must be one of..."
**Solution:** Use one of: "Meeting", "Workshop", "Seminar", "Celebration", "Other"

## Response Format

### Success (201)
```json
{
  "success": true,
  "message": "Event created successfully",
  "event": {
    "id": 30,
    "title": "Tech Workshop 2025",
    "registrationFee": 499.99,
    // ... other fields
  }
}
```

### Error (400)
```json
{
  "success": false,
  "errors": [
    {
      "msg": "Event title is required",
      "param": "title",
      "location": "body"
    }
  ]
}
```

## Notes

- All date/time values should be sent as strings
- If `endDate` is not provided but `endTime` is, `endDate` defaults to `startDate`
- Image upload uses multipart/form-data (set `Content-Type: multipart/form-data`)
- Default values:
  - `type`: "Other"
  - `priority`: "Medium"
  - `isActive`: true
  - `isPublic`: true

