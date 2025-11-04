# Edit Event API Documentation

## Endpoint Overview

**Endpoint**: `PUT /api/events/:id`  
**Authentication**: Required (Bearer Token)  
**Content-Type**: `application/json`  
**Access**: Admin, Sub-admin (district-based access)

---

## Request

### URL Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | Integer | Yes | Event ID to update |

### Headers

```
Authorization: Bearer {token}
Content-Type: application/json
```

### Request Body Fields

All fields are **optional** - only send fields that need to be updated.

#### Basic Information

| Field | Type | Validation | Description | Alias |
|-------|------|------------|-------------|-------|
| `title` | String | Required if provided, min 2 chars | Event title | `name` |
| `description` | String | - | Event description | - |
| `type` | String | Enum: `Meeting`, `Workshop`, `Seminar`, `Celebration`, `Other` | Event type | - |

#### Date & Time

**Option 1: Combined DateTime Format** (Recommended)

| Field | Type | Format | Example |
|-------|------|--------|---------|
| `startDateTime` | String | `YYYY-MM-DDTHH:MM` or ISO8601 | `2025-01-15T10:30` |
| `endDateTime` | String | `YYYY-MM-DDTHH:MM` or ISO8601 | `2025-01-15T18:00` |

**Option 2: Separate Date and Time**

| Field | Type | Format | Example |
|-------|------|--------|---------|
| `startDate` | String | `YYYY-MM-DD` | `2025-01-15` |
| `startTime` | String | `HH:MM` (24-hour) | `10:30` |
| `endDate` | String | `YYYY-MM-DD` | `2025-01-15` |
| `endTime` | String | `HH:MM` (24-hour) | `18:00` |

**Date/Time Behavior:**
- If only `startDate` provided → Preserves existing time
- If only `startTime` provided → Uses existing date with new time
- If both provided → Combines date and time
- Same logic applies to `endDate` and `endTime`

#### Location

| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| `location` | String | - | Event location name |
| `address` | String | - | Full address |
| `city` | String | - | City name |
| `district` | String | - | District name |
| `state` | String | - | State name |
| `pincode` | String | 6 digits | Postal code |

#### Contact Information

| Field | Type | Validation | Description |
|-------|------|------------|-------------|
| `contactPerson` | String | - | Contact person name |
| `contactPhone` | String | Phone format | Contact phone number |
| `contactEmail` | String | Valid email | Contact email |

#### Event Settings

| Field | Type | Validation | Description | Alias |
|-------|------|------------|-------------|-------|
| `maxAttendees` | Integer | Min: 1 | Maximum attendees allowed | - |
| `registrationFee` | Float | Min: 0 | Registration fee amount | `fee` |
| `isActive` | Boolean | - | Event is active | - |
| `isPublic` | Boolean | - | Event is public | - |

#### Image Upload

| Field | Type | Format | Description |
|-------|------|--------|-------------|
| `image` | String (URL) | Valid URL | Cloudinary image URL |
| `imageURL` | String (URL) | Valid URL | Cloudinary image URL (alternative field name) |

**Note**: 
- Accepts Cloudinary URLs (e.g., `https://res.cloudinary.com/your-cloud/image/upload/v1234567890/image.jpg`)
- Accepts both `image` and `imageURL` fields (prioritizes `imageURL` if both provided)
- Old local images are automatically deleted when new Cloudinary URL is provided
- If old image is a Cloudinary URL, it's not deleted (managed by Cloudinary)

---

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Event updated successfully",
  "event": {
    "id": 33,
    "title": "Updated Event Title",
    "description": "Updated description",
    "type": "Seminar",
    "startDate": "2025-01-15T05:00:00.000Z",
    "endDate": "2025-01-15T12:30:00.000Z",
    "location": "Conference Hall",
    "address": "123 Main Street",
    "city": "Pune",
    "district": "Pune",
    "state": "Maharashtra",
    "pincode": "411001",
    "contactPerson": "John Doe",
    "contactPhone": "9876543210",
    "contactEmail": "contact@example.com",
    "maxAttendees": 100,
    "registrationFee": 500.00,
    "isActive": true,
    "isPublic": true,
    "image": "event-image-1234567890.jpg",
    "imageURL": "https://backend-url/uploads/event-images/event-image-1234567890.jpg",
    "createdBy": 1,
    "updatedBy": 1,
    "status": "Upcoming",
    "createdAt": "2025-01-10T10:00:00.000Z",
    "updatedAt": "2025-01-15T10:30:00.000Z",
    "createdByUser": {
      "name": "Admin User",
      "email": "admin@example.com"
    },
    "updatedByUser": {
      "name": "Admin User",
      "email": "admin@example.com"
    }
  },
  "uploadedFiles": {
    "image": {
      "filename": "event-image-1234567890.jpg",
      "url": "https://backend-url/uploads/event-images/event-image-1234567890.jpg"
    }
  }
}
```

### Error Responses

#### 400 Bad Request - Validation Error

```json
{
  "success": false,
  "errors": [
    {
      "msg": "Invalid startDateTime format",
      "param": "startDateTime",
      "location": "body"
    }
  ]
}
```

#### 403 Forbidden - Access Denied

```json
{
  "success": false,
  "message": "Access denied to event in different district"
}
```

#### 404 Not Found

```json
{
  "success": false,
  "message": "Event not found"
}
```

#### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Server error while updating event"
}
```

---

## Examples

### Example 1: Update Event Title Only

```javascript
// Using fetch
const response = await fetch('https://api.example.com/api/events/33', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'New Event Title'
  })
});

const data = await response.json();
console.log(data);
```

### Example 2: Update Date and Time (Combined Format)

```javascript
const formData = new FormData();
formData.append('startDateTime', '2025-01-15T10:30');
formData.append('endDateTime', '2025-01-15T18:00');

const response = await fetch('https://api.example.com/api/events/33', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`
    // DO NOT set Content-Type for FormData
  },
  body: formData
});
```

### Example 3: Update Date and Time (Separate Fields)

```javascript
const formData = new FormData();
formData.append('startDate', '2025-01-15');
formData.append('startTime', '10:30');
formData.append('endDate', '2025-01-15');
formData.append('endTime', '18:00');

const response = await fetch('https://api.example.com/api/events/33', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### Example 4: Update Event Image (Cloudinary URL)

```javascript
const response = await fetch('https://api.example.com/api/events/33', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Updated Event',
    imageURL: 'https://res.cloudinary.com/your-cloud/image/upload/v1234567890/event-image.jpg'
  })
});

const data = await response.json();
console.log('New image URL:', data.event.imageURL);
```

### Example 5: Update Multiple Fields with Image URL

```javascript
const response = await fetch('https://api.example.com/api/events/33', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    title: 'Updated Event Title',
    description: 'Updated description',
    startDate: '2025-01-15',
    startTime: '10:30',
    endDate: '2025-01-15',
    endTime: '18:00',
    city: 'Mumbai',
    registrationFee: '1000',
    imageURL: 'https://res.cloudinary.com/your-cloud/image/upload/v1234567890/event.jpg'
  })
});
```

### Example 6: Update Only Time (Preserve Date)

```javascript
// Only update start time, keep existing date
const formData = new FormData();
formData.append('startTime', '14:00');

const response = await fetch('https://api.example.com/api/events/33', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

### Example 7: Update Only Date (Preserve Time)

```javascript
// Only update start date, keep existing time
const formData = new FormData();
formData.append('startDate', '2025-02-01');

const response = await fetch('https://api.example.com/api/events/33', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});
```

---

## Frontend Implementation Guide

### React Example

```jsx
import React, { useState } from 'react';
import axios from 'axios';

function EditEventForm({ eventId, event, onUpdate }) {
  const [formData, setFormData] = useState({
    title: event.title || '',
    description: event.description || '',
    startDate: event.startDate ? event.startDate.split('T')[0] : '',
    startTime: event.startDate ? event.startDate.split('T')[1]?.slice(0, 5) : '',
    imageURL: event.imageURL || '', // Cloudinary URL
    // ... other fields
  });
  const [loading, setLoading] = useState(false);

  const handleImageUpload = async (file) => {
    // Upload to Cloudinary first
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'your_upload_preset'); // Your Cloudinary preset
    
    const cloudinaryResponse = await fetch('https://api.cloudinary.com/v1_1/your-cloud-name/image/upload', {
      method: 'POST',
      body: formData
    });
    
    const cloudinaryData = await cloudinaryResponse.json();
    return cloudinaryData.secure_url; // Cloudinary URL
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.put(
        `/api/events/${eventId}`,
        formData, // Send JSON with Cloudinary URL
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success) {
        onUpdate(response.data.event);
        alert('Event updated successfully!');
      }
    } catch (error) {
      console.error('Error updating event:', error.response?.data || error.message);
      alert('Failed to update event');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const cloudinaryUrl = await handleImageUpload(file);
      setFormData({ ...formData, imageURL: cloudinaryUrl });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={formData.title}
        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        placeholder="Event Title"
      />
      
      <input
        type="date"
        value={formData.startDate}
        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
      />
      
      <input
        type="time"
        value={formData.startTime}
        onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
      />
      
      <input
        type="file"
        accept="image/*"
        onChange={handleImageChange}
      />
      
      {formData.imageURL && (
        <img src={formData.imageURL} alt="Preview" style={{ maxWidth: '200px' }} />
      )}
      
      <button type="submit" disabled={loading}>
        {loading ? 'Updating...' : 'Update Event'}
      </button>
    </form>
  );
}
```

### Vanilla JavaScript Example

```javascript
async function uploadToCloudinary(file) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', 'your_upload_preset'); // Your Cloudinary preset
  
  const response = await fetch('https://api.cloudinary.com/v1_1/your-cloud-name/image/upload', {
    method: 'POST',
    body: formData
  });
  
  const data = await response.json();
  return data.secure_url; // Cloudinary URL
}

async function updateEvent(eventId, eventData, imageFile) {
  // Upload image to Cloudinary first if provided
  if (imageFile) {
    eventData.imageURL = await uploadToCloudinary(imageFile);
  }
  
  try {
    const response = await fetch(`/api/events/${eventId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('Event updated:', data.event);
      return data.event;
    } else {
      throw new Error(data.message || 'Failed to update event');
    }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Usage
const imageFile = document.getElementById('imageInput').files[0];
updateEvent(33, {
  title: 'Updated Title',
  startDate: '2025-01-15',
  startTime: '10:30'
}, imageFile);
```

---

## Important Notes

### 1. Partial Updates
- **Only send fields that need to be updated**
- Omitted fields will remain unchanged
- This allows for efficient partial updates

### 2. Image Upload (Cloudinary)
- **Accepts Cloudinary URL** as string (not file upload)
- Field name: `image` or `imageURL` (both accepted, `imageURL` prioritized)
- Upload image to Cloudinary first, then send the URL to this API
- Old local images are automatically deleted when new Cloudinary URL is provided
- Cloudinary URLs are stored directly in database

### 3. Date/Time Handling
- **Combined format** (`startDateTime`/`endDateTime`): Recommended for simplicity
- **Separate format** (`startDate`/`startTime`): Use when you need to update only date or only time
- Time format: `HH:MM` (24-hour format, e.g., `14:30` not `2:30 PM`)
- Date format: `YYYY-MM-DD`

### 4. Field Aliases
- `name` → `title` (automatically converted)
- `fee` → `registrationFee` (automatically converted)

### 5. Access Control
- **Admin**: Can update any event
- **Sub-admin**: Can only update events in their district
- Returns 403 if access denied

### 6. Validation
- All fields are validated according to their rules
- Invalid data returns 400 with error details
- End date must be after start date

### 7. Time Preservation
- If updating only date → existing time is preserved
- If updating only time → existing date is preserved
- This allows for flexible updates

---

## Error Handling

### Common Errors

#### Invalid Date Format
```json
{
  "success": false,
  "errors": [
    {
      "msg": "Invalid startDateTime format",
      "param": "startDateTime"
    }
  ]
}
```
**Solution**: Use format `YYYY-MM-DDTHH:MM` (e.g., `2025-01-15T10:30`)

#### Invalid Time Format
```json
{
  "success": false,
  "errors": [
    {
      "msg": "Invalid time format",
      "param": "startTime"
    }
  ]
}
```
**Solution**: Use 24-hour format `HH:MM` (e.g., `14:30`)

#### Invalid Image URL Format
```json
{
  "success": false,
  "errors": [
    {
      "msg": "Image must be a valid URL",
      "param": "image"
    }
  ]
}
```
**Solution**: Ensure image URL is a valid HTTP/HTTPS URL (e.g., Cloudinary URL)

#### End Date Before Start Date
```json
{
  "success": false,
  "message": "End date must be after start date"
}
```
**Solution**: Ensure end date/time is after start date/time

---

## Testing Checklist

- [ ] Update event title only
- [ ] Update event description
- [ ] Update date and time (combined format)
- [ ] Update date and time (separate fields)
- [ ] Update only date (time preserved)
- [ ] Update only time (date preserved)
- [ ] Update event image
- [ ] Update multiple fields at once
- [ ] Update event without image (image unchanged)
- [ ] Verify old image is deleted when new one uploaded
- [ ] Verify image URL is returned correctly
- [ ] Test with invalid data (validation errors)
- [ ] Test access control (sub-admin district)

---

## Related Documentation

- [Event Creation API](./API_Event_Creation_Fields.md)
- [Event Update API Fixes](./EVENT_UPDATE_API_FIXES.md)
- [Event Image Update Verification](./EVENT_IMAGE_UPDATE_VERIFICATION.md)

---

**Last Updated**: After fixing time and image update issues

