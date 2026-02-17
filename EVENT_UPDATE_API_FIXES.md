# Event Update API Fixes

## Issues Fixed

### 1. ✅ Time Not Being Set Properly
**Problem**: When updating event details, the selected time was not being saved.

**Root Cause**: The update endpoint (`PUT /api/events/:id`) was not handling time fields (`startTime`, `endTime`, `startDateTime`, `endDateTime`) like the create endpoint does.

**Solution**: Updated the endpoint to:
- Accept `startDateTime`/`endDateTime` (combined format)
- Accept `startTime`/`endTime` (separate time fields)
- Combine date and time when both are provided
- Preserve existing time when only date is updated
- Update time when only time is provided

### 2. ✅ Event Image Not Updating
**Problem**: Event image was not being updated when uploading a new image.

**Root Cause**: 
- The update logic was using spread operator (`...req.body`) which could overwrite fields
- Image URL generation was using hardcoded path instead of helper function

**Solution**:
- Changed to only update fields that are explicitly provided
- Fixed image URL generation to use `getFileUrl` helper
- Properly handle image upload via multer middleware

---

## API Endpoint: PUT /api/events/:id

### Supported Request Formats

#### Option 1: Separate Date and Time Fields
```json
{
  "startDate": "2025-01-06",
  "startTime": "10:30",
  "endDate": "2025-01-08",
  "endTime": "18:00"
}
```

#### Option 2: Combined DateTime Format
```json
{
  "startDateTime": "2025-01-06T10:30",
  "endDateTime": "2025-01-08T18:00"
}
```

#### Option 3: ISO8601 Format
```json
{
  "startDateTime": "2025-01-06T10:30:00Z",
  "endDateTime": "2025-01-08T18:00:00Z"
}
```

### Image Upload

**Important**: To update event image, send request as `multipart/form-data`:

```javascript
const formData = new FormData();
formData.append('title', 'Updated Event Title');
formData.append('startDate', '2025-01-06');
formData.append('startTime', '10:30');
formData.append('image', imageFile); // Image file

fetch('/api/events/33', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`
    // DO NOT set Content-Type - browser sets it automatically
  },
  body: formData
});
```

---

## Frontend Implementation Guide

### Updating Event with Time

```javascript
// Example: Update event with date and time
const updateEvent = async (eventId, eventData) => {
  const formData = new FormData();
  
  // Add text fields
  if (eventData.title) formData.append('title', eventData.title);
  if (eventData.description) formData.append('description', eventData.description);
  
  // Add date and time (separate fields)
  if (eventData.startDate) formData.append('startDate', eventData.startDate);
  if (eventData.startTime) formData.append('startTime', eventData.startTime);
  if (eventData.endDate) formData.append('endDate', eventData.endDate);
  if (eventData.endTime) formData.append('endTime', eventData.endTime);
  
  // OR use combined format
  // if (eventData.startDateTime) formData.append('startDateTime', eventData.startDateTime);
  // if (eventData.endDateTime) formData.append('endDateTime', eventData.endDateTime);
  
  // Add image if provided
  if (eventData.imageFile) {
    formData.append('image', eventData.imageFile);
  }
  
  // Add other fields as needed
  if (eventData.city) formData.append('city', eventData.city);
  if (eventData.registrationFee !== undefined) {
    formData.append('registrationFee', eventData.registrationFee);
  }
  
  const response = await fetch(`/api/events/${eventId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${authToken}`
      // DO NOT set Content-Type header
    },
    body: formData
  });
  
  return await response.json();
};
```

### Handling Time Inputs

```javascript
// If using separate date and time inputs
const formData = {
  startDate: '2025-01-06',      // From date picker
  startTime: '10:30',           // From time picker (HH:MM format)
  endDate: '2025-01-08',        // From date picker
  endTime: '18:00'              // From time picker (HH:MM format)
};

// If using datetime picker
const formData = {
  startDateTime: '2025-01-06T10:30',  // Combined format
  endDateTime: '2025-01-08T18:00'     // Combined format
};
```

---

## Response Format

### Success Response (200)
```json
{
  "success": true,
  "message": "Event updated successfully",
  "event": {
    "id": 33,
    "title": "Updated Event",
    "startDate": "2025-01-06T05:00:00.000Z",
    "endDate": "2025-01-08T12:30:00.000Z",
    "image": "event-image-1234567890.jpg",
    "imageURL": "https://mandapam-backend-97mi.onrender.com/uploads/event-images/event-image-1234567890.jpg",
    ...
  },
  "uploadedFiles": {
    "image": {
      "filename": "event-image-1234567890.jpg",
      "url": "https://mandapam-backend-97mi.onrender.com/uploads/event-images/event-image-1234567890.jpg"
    }
  }
}
```

---

## Important Notes

### 1. Time Format
- **Separate time field**: Use `HH:MM` format (e.g., `10:30`, `18:00`)
- **Combined datetime**: Use `YYYY-MM-DDTHH:MM` format (e.g., `2025-01-06T10:30`)

### 2. Image Upload
- **Must use `multipart/form-data`** when including image
- **Field name**: `image` (not `imageFile` or `photo`)
- **Max size**: 10MB
- **Supported formats**: jpg, jpeg, png, gif, webp

### 3. Partial Updates
- Only send fields that need to be updated
- Omitted fields will not be changed
- To update only time without changing date, send only `startTime` or `endTime`

### 4. Date/Time Combination Logic
- If both `startDate` and `startTime` provided → Combined into single datetime
- If only `startDate` provided → Preserves existing time from event
- If only `startTime` provided → Uses existing date with new time
- Same logic applies to `endDate` and `endTime`

---

## Testing Checklist

- [ ] Update event with separate date and time fields
- [ ] Update event with combined datetime format
- [ ] Update only date (time should be preserved)
- [ ] Update only time (date should be preserved)
- [ ] Update event image
- [ ] Update event without image (image should remain unchanged)
- [ ] Verify time is saved correctly in database
- [ ] Verify image URL is returned correctly

---

**Last Updated**: After fixing time and image update issues

