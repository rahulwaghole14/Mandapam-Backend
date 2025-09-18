# Event Gallery API Documentation

## Overview
This document provides comprehensive API documentation for the Event Gallery system. The gallery APIs allow mobile applications to manage images associated with events, including uploading, retrieving, updating, and deleting gallery images.

## Base URL
```
Production: https://mandapam-backend-97mi.onrender.com
Development: http://localhost:5000
```

## Authentication
Gallery APIs support two types of authentication:

### Admin/Web App Authentication
For admin users and web applications:
```
Authorization: Bearer <admin_jwt_token>
```

### Mobile App Authentication
For mobile app members:
```
Authorization: Bearer <mobile_member_jwt_token>
```

**Note:** Mobile members should use the `/api/mobile/gallery/` endpoints, while admin users can use the `/api/gallery/` endpoints.

## API Endpoints

### Admin/Web App Endpoints (use `/api/gallery/`)

### 1. Get Gallery Images for an Event

**Endpoint:** `GET /api/gallery/event/{eventId}`

**Description:** Retrieve all gallery images for a specific event with pagination support.

**Parameters:**
- `eventId` (path, required): The ID of the event
- `page` (query, optional): Page number (default: 1, min: 1)
- `limit` (query, optional): Number of images per page (default: 20, max: 100)
- `featured` (query, optional): Filter for featured images only (true/false)

**Example Request:**
```http
GET /api/gallery/event/123?page=1&limit=10&featured=false
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example Response:**
```json
{
  "success": true,
  "images": [
    {
      "id": 1,
      "entityType": "event",
      "entityId": 123,
      "filename": "gallery-1703123456789-123456789.jpg",
      "originalName": "event-photo.jpg",
      "caption": "Beautiful event setup",
      "altText": "Event setup photo",
      "displayOrder": 1,
      "isActive": true,
      "isFeatured": true,
      "fileSize": 2048576,
      "mimeType": "image/jpeg",
      "uploadedBy": 1,
      "createdAt": "2023-12-21T10:30:00.000Z",
      "updatedAt": "2023-12-21T10:30:00.000Z",
      "uploadedByUser": {
        "id": 1,
        "name": "Admin User",
        "email": "admin@mandap.com"
      },
      "imageURL": "/uploads/gallery-1703123456789-123456789.jpg"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalImages": 25,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Error Responses:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "msg": "Page must be a positive integer",
      "param": "page",
      "location": "query"
    }
  ]
}
```

### 2. Upload Gallery Images

**Endpoint:** `POST /api/gallery/event/{eventId}`

**Description:** Upload multiple images to an event's gallery.

**Content-Type:** `multipart/form-data`

**Parameters:**
- `eventId` (path, required): The ID of the event
- `images` (form-data, required): Array of image files (max 10 files, 10MB each)
- `captions` (form-data, optional): Array of captions for each image
- `altTexts` (form-data, optional): Array of alt text for each image

**Supported Image Formats:**
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

**Example Request:**
```http
POST /api/gallery/event/123
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: multipart/form-data

Form Data:
- images: [file1.jpg, file2.jpg]
- captions: ["First image caption", "Second image caption"]
- altTexts: ["Alt text 1", "Alt text 2"]
```

**Example Response:**
```json
{
  "success": true,
  "message": "2 images uploaded successfully",
  "images": [
    {
      "id": 1,
      "entityType": "event",
      "entityId": 123,
      "filename": "gallery-1703123456789-123456789.jpg",
      "originalName": "event-photo1.jpg",
      "caption": "First image caption",
      "altText": "Alt text 1",
      "displayOrder": 1,
      "isActive": true,
      "isFeatured": false,
      "fileSize": 2048576,
      "mimeType": "image/jpeg",
      "uploadedBy": 1,
      "createdAt": "2023-12-21T10:30:00.000Z",
      "updatedAt": "2023-12-21T10:30:00.000Z",
      "imageURL": "/uploads/gallery-1703123456789-123456789.jpg"
    },
    {
      "id": 2,
      "entityType": "event",
      "entityId": 123,
      "filename": "gallery-1703123456790-123456790.jpg",
      "originalName": "event-photo2.jpg",
      "caption": "Second image caption",
      "altText": "Alt text 2",
      "displayOrder": 2,
      "isActive": true,
      "isFeatured": false,
      "fileSize": 1536000,
      "mimeType": "image/jpeg",
      "uploadedBy": 1,
      "createdAt": "2023-12-21T10:30:00.000Z",
      "updatedAt": "2023-12-21T10:30:00.000Z",
      "imageURL": "/uploads/gallery-1703123456790-123456790.jpg"
    }
  ]
}
```

**Error Responses:**
```json
{
  "success": false,
  "message": "No images provided"
}
```

```json
{
  "success": false,
  "message": "Invalid entity type. Must be one of: event, member, association, vendor"
}
```

### 3. Update Gallery Image

**Endpoint:** `PUT /api/gallery/{imageId}`

**Description:** Update metadata for a specific gallery image.

**Parameters:**
- `imageId` (path, required): The ID of the image to update
- `caption` (body, optional): Image caption (max 1000 characters)
- `altText` (body, optional): Alt text for accessibility (max 255 characters)
- `displayOrder` (body, optional): Display order (non-negative integer)
- `isFeatured` (body, optional): Whether image is featured (boolean)

**Example Request:**
```http
PUT /api/gallery/1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "caption": "Updated caption for the image",
  "altText": "Updated alt text",
  "isFeatured": true
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Image updated successfully",
  "image": {
    "id": 1,
    "entityType": "event",
    "entityId": 123,
    "filename": "gallery-1703123456789-123456789.jpg",
    "originalName": "event-photo.jpg",
    "caption": "Updated caption for the image",
    "altText": "Updated alt text",
    "displayOrder": 1,
    "isActive": true,
    "isFeatured": true,
    "fileSize": 2048576,
    "mimeType": "image/jpeg",
    "uploadedBy": 1,
    "createdAt": "2023-12-21T10:30:00.000Z",
    "updatedAt": "2023-12-21T10:35:00.000Z",
    "uploadedByUser": {
      "id": 1,
      "name": "Admin User",
      "email": "admin@mandap.com"
    },
    "imageURL": "/uploads/gallery-1703123456789-123456789.jpg"
  }
}
```

**Error Responses:**
```json
{
  "success": false,
  "message": "Image not found"
}
```

### 4. Delete Gallery Image

**Endpoint:** `DELETE /api/gallery/{imageId}`

**Description:** Delete a specific gallery image and its file.

**Parameters:**
- `imageId` (path, required): The ID of the image to delete

**Example Request:**
```http
DELETE /api/gallery/1
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example Response:**
```json
{
  "success": true,
  "message": "Image deleted successfully"
}
```

**Error Responses:**
```json
{
  "success": false,
  "message": "Image not found"
}
```

### 5. Reorder Gallery Images

**Endpoint:** `PUT /api/gallery/event/{eventId}/reorder`

**Description:** Reorder images in an event's gallery.

**Parameters:**
- `eventId` (path, required): The ID of the event
- `imageIds` (body, required): Array of image IDs in the desired order

**Example Request:**
```http
PUT /api/gallery/event/123/reorder
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "imageIds": [3, 1, 2, 4]
}
```

**Example Response:**
```json
{
  "success": true,
  "message": "Images reordered successfully"
}
```

**Error Responses:**
```json
{
  "success": false,
  "message": "Some images do not belong to the specified entity"
}
```

### 6. Get Gallery Statistics

**Endpoint:** `GET /api/gallery/event/{eventId}/stats`

**Description:** Get statistics for an event's gallery.

**Parameters:**
- `eventId` (path, required): The ID of the event

**Example Request:**
```http
GET /api/gallery/event/123/stats
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example Response:**
```json
{
  "success": true,
  "stats": {
    "totalImages": 25,
    "totalSize": 52428800,
    "averageSize": 2097152
  }
}
```

---

## Mobile App Endpoints (use `/api/mobile/gallery/`)

### 1. Get Gallery Images for an Event (Mobile)

**Endpoint:** `GET /api/mobile/gallery/event/{eventId}`

**Description:** Retrieve all gallery images for a specific event with pagination support (mobile version).

**Parameters:**
- `eventId` (path, required): The ID of the event
- `page` (query, optional): Page number (default: 1, min: 1)
- `limit` (query, optional): Number of images per page (default: 20, max: 100)
- `featured` (query, optional): Filter for featured images only (true/false)

**Example Request:**
```http
GET /api/mobile/gallery/event/123?page=1&limit=10&featured=false
Authorization: Bearer <mobile_member_jwt_token>
```

**Example Response:**
```json
{
  "success": true,
  "images": [
    {
      "id": 1,
      "entityType": "event",
      "entityId": 123,
      "filename": "gallery-1703123456789-123456789.jpg",
      "originalName": "event-photo.jpg",
      "caption": "Beautiful event setup",
      "altText": "Event setup photo",
      "displayOrder": 1,
      "isActive": true,
      "isFeatured": true,
      "fileSize": 2048576,
      "mimeType": "image/jpeg",
      "uploadedBy": 15,
      "createdAt": "2023-12-21T10:30:00.000Z",
      "updatedAt": "2023-12-21T10:30:00.000Z",
      "uploadedByMember": {
        "id": 15,
        "name": "rahul waghole",
        "phone": "9881976526"
      },
      "imageURL": "/uploads/gallery-1703123456789-123456789.jpg"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 3,
    "totalImages": 25,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 2. Upload Gallery Images (Mobile)

**Endpoint:** `POST /api/mobile/gallery/event/{eventId}`

**Description:** Upload multiple images to an event's gallery (mobile version).

**Content-Type:** `multipart/form-data`

**Parameters:**
- `eventId` (path, required): The ID of the event
- `images` (form-data, required): Array of image files (max 10 files, 10MB each)
- `captions` (form-data, optional): Array of captions for each image
- `altTexts` (form-data, optional): Array of alt text for each image

**Example Request:**
```http
POST /api/mobile/gallery/event/123
Authorization: Bearer <mobile_member_jwt_token>
Content-Type: multipart/form-data

Form Data:
- images: [file1.jpg, file2.jpg]
- captions: ["First image caption", "Second image caption"]
- altTexts: ["Alt text 1", "Alt text 2"]
```

**Example Response:**
```json
{
  "success": true,
  "message": "2 images uploaded successfully",
  "images": [
    {
      "id": 1,
      "entityType": "event",
      "entityId": 123,
      "filename": "gallery-1703123456789-123456789.jpg",
      "originalName": "event-photo1.jpg",
      "caption": "First image caption",
      "altText": "Alt text 1",
      "displayOrder": 1,
      "isActive": true,
      "isFeatured": false,
      "fileSize": 2048576,
      "mimeType": "image/jpeg",
      "uploadedBy": 15,
      "createdAt": "2023-12-21T10:30:00.000Z",
      "updatedAt": "2023-12-21T10:30:00.000Z",
      "imageURL": "/uploads/gallery-1703123456789-123456789.jpg"
    }
  ]
}
```

### 3. Update Gallery Image (Mobile)

**Endpoint:** `PUT /api/mobile/gallery/{imageId}`

**Description:** Update metadata for a specific gallery image (mobile version).

**Parameters:**
- `imageId` (path, required): The ID of the image to update
- `caption` (body, optional): Image caption (max 1000 characters)
- `altText` (body, optional): Alt text for accessibility (max 255 characters)
- `displayOrder` (body, optional): Display order (non-negative integer)
- `isFeatured` (body, optional): Whether image is featured (boolean)

**Example Request:**
```http
PUT /api/mobile/gallery/1
Authorization: Bearer <mobile_member_jwt_token>
Content-Type: application/json

{
  "caption": "Updated caption for the image",
  "altText": "Updated alt text",
  "isFeatured": true
}
```

### 4. Delete Gallery Image (Mobile)

**Endpoint:** `DELETE /api/mobile/gallery/{imageId}`

**Description:** Delete a specific gallery image and its file (mobile version).

**Parameters:**
- `imageId` (path, required): The ID of the image to delete

**Example Request:**
```http
DELETE /api/mobile/gallery/1
Authorization: Bearer <mobile_member_jwt_token>
```

### 5. Get Gallery Statistics (Mobile)

**Endpoint:** `GET /api/mobile/gallery/event/{eventId}/stats`

**Description:** Get statistics for an event's gallery (mobile version).

**Parameters:**
- `eventId` (path, required): The ID of the event

**Example Request:**
```http
GET /api/mobile/gallery/event/123/stats
Authorization: Bearer <mobile_member_jwt_token>
```

**Example Response:**
```json
{
  "success": true,
  "stats": {
    "totalImages": 25,
    "totalSize": 52428800,
    "averageSize": 2097152
  }
}
```

## Data Models

### Gallery Image Object
```json
{
  "id": 1,
  "entityType": "event",
  "entityId": 123,
  "filename": "gallery-1703123456789-123456789.jpg",
  "originalName": "event-photo.jpg",
  "caption": "Image caption",
  "altText": "Alt text for accessibility",
  "displayOrder": 1,
  "isActive": true,
  "isFeatured": false,
  "fileSize": 2048576,
  "mimeType": "image/jpeg",
  "uploadedBy": 1,
  "createdAt": "2023-12-21T10:30:00.000Z",
  "updatedAt": "2023-12-21T10:30:00.000Z",
  "uploadedByUser": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@mandap.com"
  },
  "imageURL": "/uploads/gallery-1703123456789-123456789.jpg"
}
```

### Pagination Object
```json
{
  "currentPage": 1,
  "totalPages": 3,
  "totalImages": 25,
  "hasNext": true,
  "hasPrev": false
}
```

### Statistics Object
```json
{
  "totalImages": 25,
  "totalSize": 52428800,
  "averageSize": 2097152
}
```

## Error Handling

### Common Error Responses

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "msg": "Error message",
      "param": "parameter_name",
      "location": "body|query|params"
    }
  ]
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
  "message": "Image not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Server error while uploading images"
}
```

## File Upload Guidelines

### Supported Formats
- **JPEG** (.jpg, .jpeg) - Recommended for photos
- **PNG** (.png) - Recommended for graphics with transparency
- **GIF** (.gif) - For animated images
- **WebP** (.webp) - Modern format with better compression

### File Size Limits
- **Maximum file size:** 10MB per image
- **Maximum files per request:** 10 images
- **Recommended dimensions:** 1920x1080 or smaller for optimal performance

### Best Practices
1. **Compress images** before uploading to reduce file size
2. **Use appropriate formats** (JPEG for photos, PNG for graphics)
3. **Provide meaningful captions** and alt text for accessibility
4. **Set featured images** to highlight important photos
5. **Use proper display order** to organize images logically

## Mobile App Integration Examples

### React Native Example (Image Upload - Mobile)
```javascript
const uploadEventImages = async (eventId, images, captions = []) => {
  const formData = new FormData();
  
  images.forEach((image, index) => {
    formData.append('images', {
      uri: image.uri,
      type: image.type,
      name: image.fileName || `image_${index}.jpg`
    });
  });
  
  if (captions.length > 0) {
    formData.append('captions', JSON.stringify(captions));
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/mobile/gallery/event/${eventId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mobileAuthToken}`, // Use mobile auth token
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};
```

### Flutter Example (Get Gallery Images - Mobile)
```dart
Future<Map<String, dynamic>> getEventGallery(int eventId, {int page = 1, int limit = 20}) async {
  final response = await http.get(
    Uri.parse('$apiBaseUrl/api/mobile/gallery/event/$eventId?page=$page&limit=$limit'),
    headers: {
      'Authorization': 'Bearer $mobileAuthToken', // Use mobile auth token
      'Content-Type': 'application/json',
    },
  );
  
  if (response.statusCode == 200) {
    return json.decode(response.body);
  } else {
    throw Exception('Failed to load gallery images');
  }
}
```

### React Native Example (Get Gallery Images - Mobile)
```javascript
const getEventGallery = async (eventId, page = 1, limit = 20, featured = false) => {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      featured: featured.toString()
    });
    
    const response = await fetch(`${API_BASE_URL}/api/mobile/gallery/event/${eventId}?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${mobileAuthToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Get gallery error:', error);
    throw error;
  }
};
```

## Rate Limiting
- **Upload requests:** Limited to prevent abuse
- **Get requests:** Standard rate limiting applies
- **Recommendation:** Implement client-side caching for gallery images

## Security Considerations
1. **Authentication required** for all operations
2. **File type validation** on server side
3. **File size limits** enforced
4. **User permissions** checked for each operation
5. **Input validation** for all parameters

## Support
For technical support or questions about the Event Gallery API, please contact the backend development team.

---

**Last Updated:** December 2024  
**API Version:** 1.0  
**Documentation Version:** 1.0
