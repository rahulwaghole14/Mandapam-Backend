# Frontend Implementation Guide: Event Registration with Photo Upload

## Overview

This guide explains how to implement the **photo upload feature** in the event registration form. The registration endpoint now accepts profile photos along with other registration data.

---

## 📋 Key Information

- **Endpoint**: `POST /api/public/events/:id/register-payment`
- **Content-Type**: `multipart/form-data` (automatically set by browser when using FormData)
- **Photo Field Name**: `photo`
- **Max File Size**: 5MB
- **Supported Formats**: jpg, jpeg, png, gif, webp

---

## 🎯 Implementation Steps

### 1. Add Photo Upload Field to Form

Add a file input field to your registration form:

```html
<form id="registrationForm" enctype="multipart/form-data">
  <!-- Other form fields -->
  <input type="text" name="name" id="name" required />
  <input type="tel" name="phone" id="phone" required />
  <input type="email" name="email" id="email" required />
  <!-- ... other fields ... -->
  
  <!-- Photo Upload Field -->
  <div class="photo-upload-section">
    <label for="photo">Profile Photo (Optional)</label>
    <input 
      type="file" 
      id="photo" 
      name="photo" 
      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
      onChange={handlePhotoChange}
    />
    <small>Max file size: 5MB. Supported formats: JPG, PNG, GIF, WEBP</small>
    
    <!-- Photo Preview -->
    <div id="photoPreview" style="display: none;">
      <img id="previewImage" src="" alt="Preview" style="max-width: 200px; max-height: 200px; margin-top: 10px;" />
      <button type="button" onClick={removePhoto}>Remove</button>
    </div>
  </div>
  
  <button type="submit">Register</button>
</form>
```

---

### 2. Handle Photo Selection and Preview

```javascript
// Photo preview handler
function handlePhotoChange(event) {
  const file = event.target.files[0];
  
  if (!file) {
    document.getElementById('photoPreview').style.display = 'none';
    return;
  }
  
  // Validate file size (5MB = 5 * 1024 * 1024 bytes)
  const maxSize = 5 * 1024 * 1024; // 5MB in bytes
  if (file.size > maxSize) {
    alert('File size exceeds 5MB limit. Please choose a smaller image.');
    event.target.value = ''; // Clear the input
    return;
  }
  
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    alert('Invalid file type. Please upload an image (JPG, PNG, GIF, or WEBP).');
    event.target.value = ''; // Clear the input
    return;
  }
  
  // Show preview
  const reader = new FileReader();
  reader.onload = function(e) {
    document.getElementById('previewImage').src = e.target.result;
    document.getElementById('photoPreview').style.display = 'block';
  };
  reader.readAsDataURL(file);
}

// Remove photo handler
function removePhoto() {
  document.getElementById('photo').value = '';
  document.getElementById('photoPreview').style.display = 'none';
}
```

---

### 3. Update Registration Function

Update your registration function to use `FormData` instead of JSON:

```javascript
// Complete registration function with photo upload
async function registerForEvent(eventId, formData) {
  try {
    // Create FormData object
    const formDataToSend = new FormData();
    
    // Add all form fields
    formDataToSend.append('name', formData.name);
    formDataToSend.append('phone', formData.phone);
    formDataToSend.append('email', formData.email);
    formDataToSend.append('businessName', formData.businessName);
    formDataToSend.append('businessType', formData.businessType);
    formDataToSend.append('city', formData.city);
    formDataToSend.append('associationId', formData.associationId);
    
    // Add photo if selected
    const photoInput = document.getElementById('photo');
    if (photoInput.files.length > 0) {
      formDataToSend.append('photo', photoInput.files[0]);
    }
    
    // Make API request
    const response = await fetch(`/api/public/events/${eventId}/register-payment`, {
      method: 'POST',
      // DO NOT set Content-Type header - browser will set it automatically with boundary
      body: formDataToSend
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Registration failed');
    }
    
    // Handle free event
    if (data.isFree) {
      // Show success message with QR code and photo
      displayRegistrationSuccess(data);
      return;
    }
    
    // Handle paid event - proceed with payment
    openRazorpayCheckout(data.paymentOptions, eventId, data.member.id);
    
  } catch (error) {
    console.error('Registration error:', error);
    alert(error.message || 'Registration failed. Please try again.');
  }
}
```

---

### 4. Display Uploaded Photo After Registration

Update your success display to show the uploaded photo:

```javascript
function displayRegistrationSuccess(data) {
  const successHtml = `
    <div class="registration-success">
      <h2>Registration Successful!</h2>
      
      <!-- Display uploaded photo if available -->
      ${data.member.profileImageURL ? `
        <div class="profile-photo">
          <img src="${data.member.profileImageURL}" alt="Profile Photo" 
               style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover;" />
        </div>
      ` : ''}
      
      <div class="member-info">
        <p><strong>Name:</strong> ${data.member.name}</p>
        <p><strong>Phone:</strong> ${data.member.phone}</p>
        <p><strong>Status:</strong> ${data.registration.status}</p>
      </div>
      
      <!-- QR Code -->
      <div class="qr-code">
        <img src="${data.qrDataURL}" alt="QR Code" />
        <p>Scan this QR code at the event entrance</p>
      </div>
      
      <button onClick={downloadQRCode(data.qrDataURL)}>Download QR Code</button>
    </div>
  `;
  
  document.getElementById('registrationContainer').innerHTML = successHtml;
}
```

---

## 📝 Complete React Example

```jsx
import React, { useState } from 'react';

function EventRegistrationForm({ eventId }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    businessName: '',
    businessType: '',
    city: '',
    associationId: ''
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);

  // Handle form input changes
  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Handle photo selection
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    
    if (!file) {
      setPhoto(null);
      setPhotoPreview(null);
      return;
    }
    
    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit');
      e.target.value = '';
      return;
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Please upload an image.');
      e.target.value = '';
      return;
    }
    
    setPhoto(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPhotoPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Create FormData
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('businessName', formData.businessName);
      formDataToSend.append('businessType', formData.businessType);
      formDataToSend.append('city', formData.city);
      formDataToSend.append('associationId', formData.associationId);
      
      // Add photo if selected
      if (photo) {
        formDataToSend.append('photo', photo);
      }
      
      // Make API request
      const response = await fetch(`/api/public/events/${eventId}/register-payment`, {
        method: 'POST',
        body: formDataToSend
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Registration failed');
      }
      
      // Handle success
      if (data.isFree) {
        // Free event - show success
        alert('Registration successful!');
        // Display QR code and photo
        console.log('QR Code:', data.qrDataURL);
        console.log('Photo URL:', data.member.profileImageURL);
      } else {
        // Paid event - proceed with payment
        openRazorpayCheckout(data.paymentOptions, eventId, data.member.id);
      }
      
    } catch (error) {
      console.error('Registration error:', error);
      alert(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <input 
        type="text" 
        name="name" 
        value={formData.name}
        onChange={handleInputChange}
        placeholder="Full Name"
        required
      />
      
      <input 
        type="tel" 
        name="phone" 
        value={formData.phone}
        onChange={handleInputChange}
        placeholder="Phone Number"
        required
      />
      
      {/* ... other fields ... */}
      
      {/* Photo Upload */}
      <div className="photo-upload">
        <label htmlFor="photo">Profile Photo (Optional)</label>
        <input 
          type="file" 
          id="photo" 
          name="photo"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handlePhotoChange}
        />
        <small>Max 5MB. Supported: JPG, PNG, GIF, WEBP</small>
        
        {/* Photo Preview */}
        {photoPreview && (
          <div className="photo-preview">
            <img src={photoPreview} alt="Preview" style={{ maxWidth: '200px', maxHeight: '200px' }} />
            <button type="button" onClick={() => {
              setPhoto(null);
              setPhotoPreview(null);
              document.getElementById('photo').value = '';
            }}>
              Remove
            </button>
          </div>
        )}
      </div>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Registering...' : 'Register'}
      </button>
    </form>
  );
}

export default EventRegistrationForm;
```

---

## 📝 Complete Vue.js Example

```vue
<template>
  <form @submit.prevent="handleSubmit">
    <!-- Form fields -->
    <input v-model="formData.name" type="text" placeholder="Full Name" required />
    <input v-model="formData.phone" type="tel" placeholder="Phone" required />
    <!-- ... other fields ... -->
    
    <!-- Photo Upload -->
    <div class="photo-upload">
      <label for="photo">Profile Photo (Optional)</label>
      <input 
        id="photo"
        type="file" 
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        @change="handlePhotoChange"
      />
      <small>Max 5MB. Supported: JPG, PNG, GIF, WEBP</small>
      
      <!-- Photo Preview -->
      <div v-if="photoPreview" class="photo-preview">
        <img :src="photoPreview" alt="Preview" style="max-width: 200px;" />
        <button type="button" @click="removePhoto">Remove</button>
      </div>
    </div>
    
    <button type="submit" :disabled="loading">
      {{ loading ? 'Registering...' : 'Register' }}
    </button>
  </form>
</template>

<script>
export default {
  data() {
    return {
      formData: {
        name: '',
        phone: '',
        email: '',
        businessName: '',
        businessType: '',
        city: '',
        associationId: ''
      },
      photo: null,
      photoPreview: null,
      loading: false
    };
  },
  methods: {
    handlePhotoChange(event) {
      const file = event.target.files[0];
      
      if (!file) {
        this.photo = null;
        this.photoPreview = null;
        return;
      }
      
      // Validate file size
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB');
        event.target.value = '';
        return;
      }
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Invalid file type');
        event.target.value = '';
        return;
      }
      
      this.photo = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.photoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    },
    
    removePhoto() {
      this.photo = null;
      this.photoPreview = null;
      document.getElementById('photo').value = '';
    },
    
    async handleSubmit() {
      this.loading = true;
      
      try {
        const formDataToSend = new FormData();
        formDataToSend.append('name', this.formData.name);
        formDataToSend.append('phone', this.formData.phone);
        formDataToSend.append('email', this.formData.email);
        formDataToSend.append('businessName', this.formData.businessName);
        formDataToSend.append('businessType', this.formData.businessType);
        formDataToSend.append('city', this.formData.city);
        formDataToSend.append('associationId', this.formData.associationId);
        
        if (this.photo) {
          formDataToSend.append('photo', this.photo);
        }
        
        const response = await fetch(`/api/public/events/${this.eventId}/register-payment`, {
          method: 'POST',
          body: formDataToSend
        });
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Registration failed');
        }
        
        if (data.isFree) {
          // Handle free event
          this.$emit('registration-success', data);
        } else {
          // Handle paid event
          this.openRazorpayCheckout(data.paymentOptions, this.eventId, data.member.id);
        }
        
      } catch (error) {
        console.error('Registration error:', error);
        alert(error.message || 'Registration failed');
      } finally {
        this.loading = false;
      }
    }
  }
};
</script>
```

---

## ⚠️ Important Notes

### 1. **Content-Type Header**
   - ❌ **DO NOT** set `Content-Type: application/json`
   - ❌ **DO NOT** set `Content-Type: multipart/form-data` manually
   - ✅ **Let the browser set it automatically** - When using `FormData`, the browser automatically sets `Content-Type: multipart/form-data` with the correct boundary

### 2. **File Validation**
   Always validate on the frontend before sending:
   - File size (max 5MB)
   - File type (images only)
   - File existence

### 3. **Error Handling**
   Handle these scenarios:
   - File too large
   - Invalid file type
   - Network errors
   - Server validation errors

### 4. **User Experience**
   - Show file size limit clearly
   - Display photo preview before upload
   - Show loading state during upload
   - Display uploaded photo after successful registration

---

## 🔄 Response Format

### Success Response (Free Event)
```json
{
  "success": true,
  "isFree": true,
  "message": "Registration successful (free event)",
  "member": {
    "id": 123,
    "name": "John Doe",
    "phone": "9876543210",
    "isNew": true,
    "profileImageURL": "https://example.com/uploads/profile-images/image-1234567890.jpg"
  },
  "registration": {
    "id": 456,
    "eventId": 32,
    "memberId": 123,
    "status": "registered",
    "paymentStatus": "free"
  },
  "qrDataURL": "data:image/png;base64,..."
}
```

### Success Response (Paid Event)
```json
{
  "success": true,
  "isFree": false,
  "message": "Member created/retrieved. Payment required.",
  "member": {
    "id": 123,
    "name": "John Doe",
    "phone": "9876543210",
    "isNew": false,
    "profileImageURL": "https://example.com/uploads/profile-images/image-1234567890.jpg"
  },
  "order": { ... },
  "paymentOptions": { ... }
}
```

---

## ✅ Checklist

- [ ] Add file input field to registration form
- [ ] Add file validation (size and type)
- [ ] Implement photo preview functionality
- [ ] Update form submission to use FormData
- [ ] Remove Content-Type header (let browser set it)
- [ ] Handle photo in API request
- [ ] Display uploaded photo in success message
- [ ] Handle errors gracefully
- [ ] Test with different file sizes and types
- [ ] Test with and without photo

---

## 🐛 Troubleshooting

### Issue: Photo not uploading
- **Check**: Are you using `FormData`?
- **Check**: Did you remove the `Content-Type` header?
- **Check**: Is the field name exactly `photo`?

### Issue: "File too large" error
- **Check**: File size validation (5MB limit)
- **Check**: Compress image before upload (optional)

### Issue: Invalid file type error
- **Check**: File type validation
- **Check**: `accept` attribute on input field

### Issue: Photo not showing after registration
- **Check**: `profileImageURL` in response
- **Check**: Image URL is accessible
- **Check**: CORS settings on backend

---

## 📞 Support

For backend issues or questions:
- Check API documentation: `API_Documentation_Public_Event_Registration.md`
- Contact backend team
- Verify endpoint URL and request format

---

**Last Updated**: November 2025

