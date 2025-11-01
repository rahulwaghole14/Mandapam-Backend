# 📋 Exhibitor Business Category API Documentation

## Overview
The Event Exhibitor endpoints now support a **business category** field to categorize exhibitors by their business type.

---

## 🆕 What Changed

### New Field Added
- **Field Name**: `businessCategory`
- **Type**: String (ENUM)
- **Required**: No (defaults to `"Other"` if not provided)
- **Location**: Event Exhibitor model

---

## 📝 Valid Business Categories

The following categories are supported:

1. `"Flower Decoration"`
2. `"Tent"`
3. `"Lighting"`
4. `"Sound"`
5. `"Furniture"`
6. `"Other"` (default)

⚠️ **Important**: The category names are case-sensitive and must match exactly as shown above.

---

## 🔌 API Endpoints

### 1. Create Exhibitor

**Endpoint**: `POST /api/events/:eventId/exhibitors`

**Request Body**:
```json
{
  "name": "Beautiful Flowers Co.",
  "businessCategory": "Flower Decoration",
  "description": "Premium flower decoration services",
  "phone": "9876543210",
  "logo": "https://example.com/logo.png"
}
```

**businessCategory Field**:
- **Optional**: Yes
- **Default**: `"Other"` (if not provided)
- **Validation**: Must be one of the 6 valid categories listed above

**Example Request**:
```javascript
// With business category
const response = await fetch('/api/events/30/exhibitors', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ADMIN_TOKEN'
  },
  body: JSON.stringify({
    name: "Party Tent Rentals",
    businessCategory: "Tent",
    description: "Premium tent rental services",
    phone: "9876543210"
  })
});

// Without business category (defaults to "Other")
const response = await fetch('/api/events/30/exhibitors', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ADMIN_TOKEN'
  },
  body: JSON.stringify({
    name: "Event Decorators",
    description: "Professional event decoration",
    phone: "9876543210"
    // businessCategory will default to "Other"
  })
});
```

**Success Response** (201):
```json
{
  "success": true,
  "exhibitor": {
    "id": 5,
    "eventId": 30,
    "name": "Party Tent Rentals",
    "businessCategory": "Tent",
    "description": "Premium tent rental services",
    "phone": "9876543210",
    "logo": null,
    "created_at": "2025-01-30T12:00:00.000Z",
    "updated_at": "2025-01-30T12:00:00.000Z"
  }
}
```

**Error Response** (400) - Invalid Category:
```json
{
  "success": false,
  "errors": [
    {
      "msg": "Invalid business category",
      "param": "businessCategory",
      "location": "body"
    }
  ]
}
```

---

### 2. Update Exhibitor

**Endpoint**: `PUT /api/events/:eventId/exhibitors/:exhibitorId`

**Request Body** (all fields optional):
```json
{
  "name": "Updated Name",
  "businessCategory": "Lighting",
  "description": "Updated description",
  "phone": "9876543210",
  "logo": "https://example.com/new-logo.png"
}
```

**businessCategory Field**:
- **Optional**: Yes
- **Behavior**: Only updates if provided; otherwise keeps existing value
- **Validation**: Must be one of the 6 valid categories

**Example Request**:
```javascript
const response = await fetch('/api/events/30/exhibitors/5', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ADMIN_TOKEN'
  },
  body: JSON.stringify({
    businessCategory: "Sound"
  })
});
```

**Success Response** (200):
```json
{
  "success": true,
  "exhibitor": {
    "id": 5,
    "eventId": 30,
    "name": "Party Tent Rentals",
    "businessCategory": "Sound",
    "description": "Premium tent rental services",
    "phone": "9876543210",
    "logo": null,
    "created_at": "2025-01-30T12:00:00.000Z",
    "updated_at": "2025-01-30T12:15:00.000Z"
  }
}
```

---

### 3. Get Exhibitors List

**Endpoint**: `GET /api/events/:eventId/exhibitors`

**Note**: This endpoint automatically includes `businessCategory` in the response (no changes needed in your request).

**Example Request**:
```javascript
const response = await fetch('/api/events/30/exhibitors', {
  method: 'GET',
  headers: {
    'Authorization': 'Bearer YOUR_ADMIN_TOKEN'
  }
});
```

**Success Response** (200):
```json
{
  "success": true,
  "exhibitors": [
    {
      "id": 1,
      "eventId": 30,
      "name": "Beautiful Flowers Co.",
      "businessCategory": "Flower Decoration",
      "description": "Premium flower decoration services",
      "phone": "9876543210",
      "logo": "https://example.com/logo.png",
      "created_at": "2025-01-30T10:00:00.000Z",
      "updated_at": "2025-01-30T10:00:00.000Z"
    },
    {
      "id": 2,
      "eventId": 30,
      "name": "Party Tent Rentals",
      "businessCategory": "Tent",
      "description": "Premium tent rental services",
      "phone": "9876543210",
      "logo": null,
      "created_at": "2025-01-30T11:00:00.000Z",
      "updated_at": "2025-01-30T11:00:00.000Z"
    },
    {
      "id": 3,
      "eventId": 30,
      "name": "Lighting Experts",
      "businessCategory": "Lighting",
      "description": "Professional lighting services",
      "phone": "9876543210",
      "logo": null,
      "created_at": "2025-01-30T11:30:00.000Z",
      "updated_at": "2025-01-30T11:30:00.000Z"
    }
  ]
}
```

---

## 🎨 Frontend Implementation Guide

### 1. **Form Dropdown Component**

Create a dropdown/select field for business category:

```jsx
// React Example
<select
  name="businessCategory"
  value={formData.businessCategory || 'Other'}
  onChange={(e) => setFormData({...formData, businessCategory: e.target.value})}
>
  <option value="Flower Decoration">Flower Decoration</option>
  <option value="Tent">Tent</option>
  <option value="Lighting">Lighting</option>
  <option value="Sound">Sound</option>
  <option value="Furniture">Furniture</option>
  <option value="Other">Other</option>
</select>
```

### 2. **Display Business Category**

Show the business category when displaying exhibitors:

```jsx
// React Example
<div className="exhibitor-card">
  <h3>{exhibitor.name}</h3>
  <span className="category-badge">{exhibitor.businessCategory}</span>
  <p>{exhibitor.description}</p>
</div>
```

### 3. **Filter Exhibitors by Category**

You can filter exhibitors on the frontend:

```javascript
// Filter exhibitors by category
const flowerDecorators = exhibitors.filter(
  exhibitor => exhibitor.businessCategory === 'Flower Decoration'
);

// Group exhibitors by category
const groupedByCategory = exhibitors.reduce((acc, exhibitor) => {
  const category = exhibitor.businessCategory || 'Other';
  if (!acc[category]) {
    acc[category] = [];
  }
  acc[category].push(exhibitor);
  return acc;
}, {});
```

### 4. **Form Validation**

If validating on the frontend:

```javascript
const validCategories = [
  'Flower Decoration',
  'Tent',
  'Lighting',
  'Sound',
  'Furniture',
  'Other'
];

function validateBusinessCategory(category) {
  return validCategories.includes(category);
}
```

---

## 📊 Migration Notes

### Existing Exhibitors
- All existing exhibitors in the database have been automatically set to `businessCategory: "Other"`
- No action needed for existing data

### Backward Compatibility
- The field is optional in both create and update operations
- If not provided, it defaults to `"Other"`
- Existing API calls without `businessCategory` will continue to work

---

## ✅ Testing Checklist

- [ ] Create exhibitor with `businessCategory` field
- [ ] Create exhibitor without `businessCategory` (should default to "Other")
- [ ] Update exhibitor with valid `businessCategory`
- [ ] Update exhibitor with invalid `businessCategory` (should return validation error)
- [ ] Verify GET endpoint returns `businessCategory` for all exhibitors
- [ ] Test filtering/grouping exhibitors by category on frontend

---

## 🔗 Related Endpoints

The business category is also automatically included in:
- Mobile app event details endpoint: `GET /api/mobile/events/:id`
- Mobile app my events endpoint: `GET /api/mobile/my/events`

No changes needed to these endpoints - they will automatically include the `businessCategory` field.

---

## 📞 Support

If you encounter any issues or have questions, please contact the backend team.

**Last Updated**: January 30, 2025

