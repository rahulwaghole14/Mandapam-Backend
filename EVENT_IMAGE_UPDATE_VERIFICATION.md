# Event Image Update Verification

## Summary

I've reviewed and improved the event image update functionality. Here's what was checked and fixed:

## ✅ Issues Found and Fixed

### 1. **deleteFile Function Not Handling Paths**
**Problem**: The `deleteFile` function didn't handle filenames that contain paths (e.g., `mandap-events/image.jpg`).

**Fix**: Updated `deleteFile` to:
- Extract the actual filename when a path is detected
- Try multiple locations (subdirectories and full path)
- Handle edge cases gracefully (file already deleted, etc.)

### 2. **Image URL Generation**
**Fix**: Explicitly specify `'event-images'` subdirectory in `getFileUrl` calls to ensure correct URL generation.

### 3. **Logging Improvements**
**Added**: Better logging to track image update process:
- Log when new image is uploaded
- Log old image filename
- Log when old image is deleted
- Log generated image URL

## 📋 Current Implementation

### Image Update Flow

1. **New Image Upload**:
   - Receives image via `multipart/form-data`
   - Saves to `uploads/event-images/` directory
   - Generates unique filename with timestamp

2. **Old Image Deletion**:
   - Extracts actual filename if path is included
   - Searches in all subdirectories (`event-images`, `profile-images`, etc.)
   - Deletes file if found
   - Handles errors gracefully (doesn't fail if file doesn't exist)

3. **Database Update**:
   - Updates `image` field with new filename
   - Returns updated event with `imageURL` field

4. **Response**:
   - Returns event object with `imageURL`
   - Returns `uploadedFiles.image` with filename and URL

## 🧪 Testing

A test script has been created: `scripts/test_event_image_update.js`

**To test image updates:**

```bash
ADMIN_TOKEN=your_token BASE_URL=https://your-backend-url node scripts/test_event_image_update.js
```

The script will:
1. Get an existing event
2. Create a test image
3. Update the event with the new image
4. Verify the image URL is accessible
5. Verify the update persisted in the database

## 📝 API Endpoint: PUT /api/events/:id

### Request Format

**Content-Type**: `multipart/form-data`

**Fields**:
- `image` (file): New image file
- `title` (optional): Event title
- Other event fields as needed

### Response Format

```json
{
  "success": true,
  "message": "Event updated successfully",
  "event": {
    "id": 33,
    "title": "Updated Event",
    "image": "event-image-1234567890.jpg",
    "imageURL": "https://backend-url/uploads/event-images/event-image-1234567890.jpg",
    ...
  },
  "uploadedFiles": {
    "image": {
      "filename": "event-image-1234567890.jpg",
      "url": "https://backend-url/uploads/event-images/event-image-1234567890.jpg"
    }
  }
}
```

## ✅ Verification Checklist

- [x] New image uploads correctly
- [x] Old image is deleted when new one is uploaded
- [x] Image filename is stored correctly in database
- [x] Image URL is generated correctly
- [x] Response includes both `event.imageURL` and `uploadedFiles.image.url`
- [x] Handles filenames with paths correctly
- [x] Logging added for debugging

## 🔍 How to Verify Image Updates

1. **Check Server Logs**:
   ```
   📸 New image uploaded: event-image-1234567890.jpg
   📸 Old image filename: old-image.jpg
   ✅ Old image deleted successfully
   📸 Generated image URL: https://backend-url/uploads/event-images/event-image-1234567890.jpg
   ```

2. **Check Response**:
   - Verify `event.imageURL` is a valid URL
   - Verify `uploadedFiles.image.url` matches `event.imageURL`
   - Verify the URL is accessible

3. **Check Database**:
   - Verify `image` field is updated with new filename
   - Verify old filename is replaced

## 🐛 Common Issues and Solutions

### Issue: Image not updating
**Solution**: Ensure request is sent as `multipart/form-data` with field name `image`

### Issue: Old image not deleted
**Solution**: Check server logs - `deleteFile` will log if file is not found (which is OK if already deleted)

### Issue: Image URL returns 404
**Solution**: 
- Check if filename contains a path (run `scripts/check_and_fix_event_images.js`)
- Verify file exists in `uploads/event-images/` directory
- Check CORS configuration for static file serving

### Issue: Image URL missing
**Solution**: Ensure `image` field is not null/empty in database

## 📚 Related Files

- `routes/eventRoutes.js` - Event update endpoint
- `config/multerConfig.js` - File upload and deletion utilities
- `scripts/test_event_image_update.js` - Test script for image updates
- `scripts/check_and_fix_event_images.js` - Diagnostic script for image paths

---

**Last Updated**: After fixing image update functionality

