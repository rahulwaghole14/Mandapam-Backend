# 📱 Event RSVP API Documentation

## Overview
This document provides comprehensive documentation for the Event RSVP (Registration) functionality. Members can register for upcoming events, cancel their registrations, and view their registration history.

## Table of Contents
1. [Authentication](#authentication)
2. [Business Rules](#business-rules)
3. [API Endpoints](#api-endpoints)
4. [Response Formats](#response-formats)
5. [Error Handling](#error-handling)
6. [Integration Examples](#integration-examples)
7. [Testing Guide](#testing-guide)

---

## Authentication

All RSVP endpoints require authentication using JWT tokens:

```http
Authorization: Bearer <jwt_token>
```

**Token Requirements:**
- Valid JWT token from mobile login
- Token must contain `memberId` and `userType: 'member'`
- Token must not be expired

---

## Business Rules

### ✅ **Registration Rules**
1. **Upcoming Events Only**: Members can only register for events with:
   - `status = 'Upcoming'`
   - `startDate` in the future
   - `isActive = true`
   - `isPublic = true`

2. **One Registration Per Event**: Each member can only have one active registration per event
   - Duplicate registrations are prevented
   - Cancelled registrations can be reactivated

3. **Capacity Limits**: Registration is subject to event capacity
   - `currentAttendees < maxAttendees` (if maxAttendees is set)
   - No limit if `maxAttendees` is null

4. **Registration Statuses**:
   - `registered` - Active registration
   - `cancelled` - Cancelled by member
   - `attended` - Member attended the event
   - `no_show` - Member didn't attend

### ✅ **Contact Information Rules**
1. **Contact Person**: Name of the event organizer/contact person
2. **Contact Phone**: Phone number for event-related queries and details
3. **Contact Email**: Email address for event information
4. **Direct Calling**: Mobile app can open phone dialer with contact number
5. **Event Details**: Members can contact for venue details, timing, requirements, etc.

---

## API Endpoints

### 1. Register for Event (RSVP)

**Endpoint:** `POST /api/mobile/events/:id/rsvp`

**Description:** Register a member for an upcoming event

**Parameters:**
- `id` (path) - Event ID

**Request Body:**
```json
{
  "notes": "Looking forward to attending" // Optional
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "Successfully registered for event",
  "registration": {
    "id": 1,
    "eventId": 18,
    "memberId": 217,
    "status": "registered",
    "registeredAt": "2025-09-19T11:21:06.000Z",
    "notes": "Looking forward to attending"
  }
}
```

**Response (Already Registered - 400):**
```json
{
  "success": false,
  "message": "You are already registered for this event"
}
```

**Response (Event Full - 400):**
```json
{
  "success": false,
  "message": "Event is at full capacity"
}
```

**Response (Past Event - 400):**
```json
{
  "success": false,
  "message": "Cannot register for past or completed events"
}
```

---

### 2. Cancel Event Registration

**Endpoint:** `DELETE /api/mobile/events/:id/rsvp`

**Description:** Cancel an existing event registration

**Parameters:**
- `id` (path) - Event ID

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Successfully cancelled event registration",
  "registration": {
    "id": 1,
    "eventId": 18,
    "memberId": 217,
    "status": "cancelled",
    "registeredAt": "2025-09-19T11:21:06.000Z"
  }
}
```

**Response (Not Registered - 404):**
```json
{
  "success": false,
  "message": "No active registration found for this event"
}
```

---

### 3. Check Registration Status

**Endpoint:** `GET /api/mobile/events/:id/rsvp`

**Description:** Check if member is registered for a specific event

**Parameters:**
- `id` (path) - Event ID

**Response (Registered - 200):**
```json
{
  "success": true,
  "isRegistered": true,
  "registration": {
    "id": 1,
    "eventId": 18,
    "memberId": 217,
    "status": "registered",
    "registeredAt": "2025-09-19T11:21:06.000Z",
    "notes": "Looking forward to attending",
    "event": {
      "id": 18,
      "title": "Annual General Meeting",
      "startDate": "2025-09-26T11:20:17.000Z",
      "status": "Upcoming"
    }
  }
}
```

**Response (Not Registered - 200):**
```json
{
  "success": true,
  "isRegistered": false,
  "message": "Not registered for this event"
}
```

---

### 4. Get My Event Registrations

**Endpoint:** `GET /api/mobile/events/my-registrations`

**Description:** Get all event registrations for the authenticated member

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 20)
- `status` (optional) - Filter by status (`registered`, `cancelled`, `attended`, `no_show`)

**Example:** `GET /api/mobile/events/my-registrations?page=1&limit=10&status=registered`

**Response (Success - 200):**
```json
{
  "success": true,
  "registrations": [
    {
      "id": 1,
      "eventId": 18,
      "status": "registered",
      "registeredAt": "2025-09-19T11:21:06.000Z",
      "notes": "Looking forward to attending",
      "event": {
        "id": 18,
        "title": "Annual General Meeting",
        "description": "AGM for all members",
        "startDate": "2025-09-26T11:20:17.000Z",
        "endDate": "2025-09-26T13:20:17.000Z",
        "location": "Community Hall",
        "status": "Upcoming",
        "maxAttendees": 50,
        "currentAttendees": 25
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "hasNextPage": false
}
```

---

### 5. Enhanced Event List (with RSVP Status)

**Endpoint:** `GET /api/mobile/events`

**Description:** Get all events with RSVP status for the authenticated member

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 20)
- `type` (optional) - Filter by event type
- `city` (optional) - Filter by city
- `search` (optional) - Search in title, description, contact person

**Response (Success - 200):**
```json
{
  "success": true,
  "count": 10,
  "total": 50,
  "page": 1,
  "pages": 5,
  "events": [
    {
      "id": 18,
      "title": "Annual General Meeting",
      "description": "AGM for all members",
      "type": "Meeting",
      "startDate": "2025-09-26T11:20:17.000Z",
      "endDate": "2025-09-26T13:20:17.000Z",
      "location": "Community Hall",
      "status": "Upcoming",
      "maxAttendees": 50,
      "currentAttendees": 25,
      "contactPerson": "Rajesh Kumar",
      "contactPhone": "9876543210",
      "contactEmail": "rajesh@mandap.com",
      "isRegistered": true,
      "registrationStatus": "registered",
      "registeredAt": "2025-09-19T11:21:06.000Z",
      "canRegister": false
    },
    {
      "id": 19,
      "title": "Workshop on New Technologies",
      "description": "Learn about latest trends",
      "type": "Workshop",
      "startDate": "2025-10-01T09:00:00.000Z",
      "endDate": "2025-10-01T17:00:00.000Z",
      "location": "Tech Center",
      "status": "Upcoming",
      "maxAttendees": 30,
      "currentAttendees": 15,
      "contactPerson": "Priya Sharma",
      "contactPhone": "9876543211",
      "contactEmail": "priya@techcenter.com",
      "isRegistered": false,
      "registrationStatus": null,
      "registeredAt": null,
      "canRegister": true
    }
  ]
}
```

**New Fields in Event Response:**
- `isRegistered` (boolean) - Whether member is registered for this event
- `registrationStatus` (string|null) - Current registration status
- `registeredAt` (string|null) - Registration timestamp
- `canRegister` (boolean) - Whether member can register (upcoming + has capacity)

**Contact Information Fields:**
- `contactPerson` (string|null) - Name of the contact person
- `contactPhone` (string|null) - Contact phone number for event details
- `contactEmail` (string|null) - Contact email for event details

---

## Response Formats

### Standard Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": { ... }
}
```

### Standard Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information" // Optional
}
```

### Pagination Response
```json
{
  "success": true,
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 20,
  "hasNextPage": true
}
```

---

## Error Handling

### HTTP Status Codes
- `200` - Success
- `201` - Created (Registration successful)
- `400` - Bad Request (Validation errors, business rule violations)
- `401` - Unauthorized (Invalid or missing token)
- `404` - Not Found (Event not found, no registration found)
- `500` - Internal Server Error

### Common Error Messages
- `"Invalid event ID"` - Event ID is not a valid number
- `"Event not found"` - Event doesn't exist
- `"You are already registered for this event"` - Duplicate registration attempt
- `"Event is at full capacity"` - No more spots available
- `"Cannot register for past or completed events"` - Event is not upcoming
- `"No active registration found for this event"` - Trying to cancel non-existent registration
- `"Not authorized, no token"` - Missing authentication token
- `"Not authorized, token failed"` - Invalid or expired token

---

## Integration Examples

### React Native Integration Example

```javascript
// RSVP Service Class
class RSVPService {
  static async registerForEvent(eventId, notes = null) {
    try {
      const response = await fetch(`/api/mobile/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message);
      }
      
      return data;
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  }
  
  static async cancelRegistration(eventId) {
    try {
      const response = await fetch(`/api/mobile/events/${eventId}/rsvp`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message);
      }
      
      return data;
    } catch (error) {
      console.error('Cancellation failed:', error);
      throw error;
    }
  }
  
  static async getRegistrationStatus(eventId) {
    try {
      const response = await fetch(`/api/mobile/events/${eventId}/rsvp`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Status check failed:', error);
      throw error;
    }
  }
  
  static async getMyRegistrations(page = 1, limit = 20, status = null) {
    try {
      let url = `/api/mobile/events/my-registrations?page=${page}&limit=${limit}`;
      if (status) url += `&status=${status}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get registrations failed:', error);
      throw error;
    }
  }
}
```

### Event Card Component Example

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, Linking } from 'react-native';

const EventCard = ({ event, onRegistrationChange }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [registrationStatus, setRegistrationStatus] = useState(event.isRegistered);

  const handleRSVP = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    try {
      if (event.isRegistered) {
        // Cancel registration
        await RSVPService.cancelRegistration(event.id);
        setRegistrationStatus(false);
        Alert.alert('Success', 'Registration cancelled successfully');
      } else {
        // Register for event
        await RSVPService.registerForEvent(event.id, 'Looking forward to attending');
        setRegistrationStatus(true);
        Alert.alert('Success', 'Registered successfully');
      }
      
      // Notify parent component
      onRegistrationChange && onRegistrationChange(event.id, !event.isRegistered);
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonText = () => {
    if (isLoading) return 'Loading...';
    if (registrationStatus) return '✓ Registered';
    if (!event.canRegister) return 'Event Full';
    return 'Register';
  };

  const getButtonStyle = () => {
    if (isLoading) return styles.loadingButton;
    if (registrationStatus) return styles.registeredButton;
    if (!event.canRegister) return styles.disabledButton;
    return styles.registerButton;
  };

  const handleContact = () => {
    if (event.contactPhone) {
      // Open phone dialer
      Linking.openURL(`tel:${event.contactPhone}`);
    }
  };

  return (
    <View style={styles.eventCard}>
      <Text style={styles.eventTitle}>{event.title}</Text>
      <Text style={styles.eventDate}>{new Date(event.startDate).toLocaleDateString()}</Text>
      <Text style={styles.eventLocation}>{event.location}</Text>
      
      {/* Contact Information */}
      {event.contactPerson && (
        <View style={styles.contactInfo}>
          <Text style={styles.contactLabel}>Contact:</Text>
          <Text style={styles.contactPerson}>{event.contactPerson}</Text>
          {event.contactPhone && (
            <TouchableOpacity onPress={handleContact} style={styles.contactButton}>
              <Text style={styles.contactPhone}>📞 {event.contactPhone}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      
      <View style={styles.eventStats}>
        <Text style={styles.attendeeCount}>
          {event.currentAttendees}/{event.maxAttendees || '∞'} attendees
        </Text>
      </View>
      
      <TouchableOpacity
        style={getButtonStyle()}
        onPress={handleRSVP}
        disabled={isLoading || (!event.canRegister && !event.isRegistered)}
      >
        <Text style={styles.buttonText}>{getButtonText()}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = {
  eventCard: {
    backgroundColor: '#fff',
    padding: 16,
    margin: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8
  },
  eventDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  eventLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12
  },
  eventStats: {
    marginBottom: 12
  },
  attendeeCount: {
    fontSize: 12,
    color: '#888'
  },
  contactInfo: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 4
  },
  contactLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 4
  },
  contactPerson: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4
  },
  contactButton: {
    alignSelf: 'flex-start'
  },
  contactPhone: {
    fontSize: 14,
    color: '#007AFF',
    textDecorationLine: 'underline'
  },
  registerButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center'
  },
  registeredButton: {
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center'
  },
  disabledButton: {
    backgroundColor: '#C7C7CC',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center'
  },
  loadingButton: {
    backgroundColor: '#AEAEB2',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center'
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold'
  }
};

export default EventCard;
```

---

## Testing Guide

### Test Scenarios

#### 1. Registration Flow
```bash
# 1. Get events list
GET /api/mobile/events
# Verify events have canRegister and isRegistered fields

# 2. Register for an event
POST /api/mobile/events/18/rsvp
{
  "notes": "Test registration"
}
# Verify success response

# 3. Try duplicate registration
POST /api/mobile/events/18/rsvp
# Verify error: "You are already registered for this event"

# 4. Check registration status
GET /api/mobile/events/18/rsvp
# Verify isRegistered: true
```

#### 2. Cancellation Flow
```bash
# 1. Cancel registration
DELETE /api/mobile/events/18/rsvp
# Verify success response

# 2. Check status after cancellation
GET /api/mobile/events/18/rsvp
# Verify isRegistered: false

# 3. Try to cancel again
DELETE /api/mobile/events/18/rsvp
# Verify error: "No active registration found"
```

#### 3. Edge Cases
```bash
# 1. Register for past event
POST /api/mobile/events/10/rsvp
# Verify error: "Cannot register for past or completed events"

# 2. Register for full event
POST /api/mobile/events/20/rsvp
# Verify error: "Event is at full capacity"

# 3. Invalid event ID
POST /api/mobile/events/99999/rsvp
# Verify error: "Event not found"
```

### Postman Collection

```json
{
  "info": {
    "name": "RSVP API Tests",
    "description": "Test collection for RSVP functionality"
  },
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:5000/api/mobile"
    },
    {
      "key": "token",
      "value": "your_jwt_token_here"
    },
    {
      "key": "eventId",
      "value": "18"
    }
  ],
  "item": [
    {
      "name": "Get Events with RSVP Status",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/events",
          "host": ["{{baseUrl}}"],
          "path": ["events"]
        }
      }
    },
    {
      "name": "Register for Event",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"notes\": \"Looking forward to attending\"\n}"
        },
        "url": {
          "raw": "{{baseUrl}}/events/{{eventId}}/rsvp",
          "host": ["{{baseUrl}}"],
          "path": ["events", "{{eventId}}", "rsvp"]
        }
      }
    },
    {
      "name": "Check Registration Status",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/events/{{eventId}}/rsvp",
          "host": ["{{baseUrl}}"],
          "path": ["events", "{{eventId}}", "rsvp"]
        }
      }
    },
    {
      "name": "Cancel Registration",
      "request": {
        "method": "DELETE",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/events/{{eventId}}/rsvp",
          "host": ["{{baseUrl}}"],
          "path": ["events", "{{eventId}}", "rsvp"]
        }
      }
    },
    {
      "name": "Get My Registrations",
      "request": {
        "method": "GET",
        "header": [
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "url": {
          "raw": "{{baseUrl}}/events/my-registrations?page=1&limit=20",
          "host": ["{{baseUrl}}"],
          "path": ["events", "my-registrations"],
          "query": [
            {
              "key": "page",
              "value": "1"
            },
            {
              "key": "limit",
              "value": "20"
            }
          ]
        }
      }
    }
  ]
}
```

---

## Support & Contact

For technical support or questions about the RSVP API:

- **Backend Team**: [Your contact information]
- **API Documentation**: [Link to full API docs]
- **Issue Tracking**: [Link to issue tracker]

---

**Last Updated:** September 19, 2025  
**Version:** 1.0.0  
**API Version:** v1
