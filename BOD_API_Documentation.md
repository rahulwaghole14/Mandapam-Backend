# 🏢 Board of Directors (BOD) API Documentation

## 📋 **Overview**
The Board of Directors API provides complete CRUD operations for managing BOD members in the Mandap Association Platform. This API has been recently updated to fix validation issues and ensure proper field mapping.

## 🔧 **Recent Fixes Applied**
- ✅ Fixed designation validation to include "Member" option
- ✅ Updated contact number validation to accept various formats
- ✅ Changed address structure from nested to flat fields
- ✅ Fixed database field mapping (designation → position column)
- ✅ Removed references to non-existent createdBy/updatedBy fields

## 🔐 **Authentication**
All BOD endpoints require admin authentication:
```http
Authorization: Bearer <jwt_token>
```

## 📍 **Base URL**
- **Development**: `http://localhost:5000`
- **Production**: `https://mandapam-backend-97mi.onrender.com`

---

## 🚀 **API Endpoints**

### **1. Get All BOD Members**
```http
GET /api/bod
Authorization: Bearer <jwt_token>
```

**Query Parameters:**
- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Results per page (default: 20)
- `designation` (string, optional): Filter by designation
- `isActive` (boolean, optional): Filter by active status

**Response:**
```json
{
  "success": true,
  "count": 7,
  "total": 7,
  "page": 1,
  "pages": 1,
  "bod": [
    {
      "id": 1,
      "name": "Rajesh Kumar",
      "designation": "President",
      "email": "president@mandap.com",
      "contactNumber": "9876543210",
      "address": "123 Main Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "profileImage": null,
      "bio": "Experienced leader in the mandap industry",
      "experience": null,
      "termStart": null,
      "termEnd": null,
      "isActive": true,
      "associationId": 7,
      "created_at": "2023-01-01T00:00:00.000Z",
      "updated_at": "2023-01-01T00:00:00.000Z"
    }
  ]
}
```

### **2. Create BOD Member**
```http
POST /api/bod
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Test BOD Member",
  "designation": "President",
  "contactNumber": "9876543210",
  "email": "test@example.com",
  "bio": "Test bio for BOD member",
  "address": "Test address, Mumbai",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "isActive": true,
  "associationId": 7
}
```

**Field Validation:**
- `name` (required): String, 2-100 characters
- `designation` (required): Must be one of:
  - "President"
  - "Vice President"
  - "Secretary"
  - "Joint Secretary"
  - "Treasurer"
  - "Joint Treasurer"
  - "Executive Member"
  - "Member" ✅ (Recently added)
- `contactNumber` (required): String, accepts formats like:
  - "9876543210"
  - "+91-9876543210"
  - "(987) 654-3210"
  - "987-654-3210"
- `email` (required): Valid email format
- `address` (optional): String, max 500 characters
- `city` (optional): String, max 100 characters
- `state` (optional): String, max 100 characters
- `pincode` (optional): 6-digit number
- `bio` (optional): String, max 500 characters
- `isActive` (optional): Boolean, defaults to true
- `associationId` (required): Valid association ID

**Response:**
```json
{
  "success": true,
  "bod": {
    "id": 14,
    "name": "Test BOD Member",
    "designation": "President",
    "email": "test@example.com",
    "contactNumber": "9876543210",
    "address": "Test address, Mumbai",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "profileImage": null,
    "bio": "Test bio for BOD member",
    "experience": null,
    "termStart": null,
    "termEnd": null,
    "isActive": true,
    "associationId": 7,
    "created_at": "2025-09-08T12:28:09.819Z",
    "updated_at": "2025-09-08T12:28:09.819Z"
  }
}
```

### **3. Get BOD Member by ID**
```http
GET /api/bod/:id
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "bod": {
    "id": 1,
    "name": "Rajesh Kumar",
    "designation": "President",
    "email": "president@mandap.com",
    "contactNumber": "9876543210",
    "address": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "profileImage": null,
    "bio": "Experienced leader in the mandap industry",
    "experience": null,
    "termStart": null,
    "termEnd": null,
    "isActive": true,
    "associationId": 7,
    "created_at": "2023-01-01T00:00:00.000Z",
    "updated_at": "2023-01-01T00:00:00.000Z"
  }
}
```

### **4. Update BOD Member**
```http
PUT /api/bod/:id
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated BOD Member",
  "designation": "Vice President",
  "contactNumber": "9876543211",
  "email": "updated@example.com",
  "bio": "Updated bio for BOD member",
  "address": "Updated address, Mumbai",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400002",
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "bod": {
    "id": 1,
    "name": "Updated BOD Member",
    "designation": "Vice President",
    "email": "updated@example.com",
    "contactNumber": "9876543211",
    "address": "Updated address, Mumbai",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400002",
    "profileImage": null,
    "bio": "Updated bio for BOD member",
    "experience": null,
    "termStart": null,
    "termEnd": null,
    "isActive": true,
    "associationId": 7,
    "created_at": "2023-01-01T00:00:00.000Z",
    "updated_at": "2025-09-08T12:30:00.000Z"
  }
}
```

### **5. Delete BOD Member**
```http
DELETE /api/bod/:id
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "message": "BOD member deleted successfully"
}
```

---

## ❌ **Error Responses**

### **400 Bad Request - Validation Error**
```json
{
  "success": false,
  "errors": [
    {
      "type": "field",
      "value": "Invalid Designation",
      "msg": "Designation is required",
      "path": "designation",
      "location": "body"
    }
  ]
}
```

### **401 Unauthorized**
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

### **404 Not Found**
```json
{
  "success": false,
  "message": "BOD member not found"
}
```

### **500 Internal Server Error**
```json
{
  "success": false,
  "message": "Server error while creating BOD member"
}
```

---

## 🧪 **Testing Examples**

### **Test with cURL**

#### **Create BOD Member**
```bash
curl -X POST "https://mandapam-backend-97mi.onrender.com/api/bod" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Test BOD Member",
    "designation": "Member",
    "contactNumber": "9876543210",
    "email": "test@example.com",
    "bio": "Test bio for BOD member",
    "address": "Test address, Mumbai",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "isActive": true,
    "associationId": 7
  }'
```

#### **Get All BOD Members**
```bash
curl -X GET "https://mandapam-backend-97mi.onrender.com/api/bod" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### **Test with JavaScript/Fetch**
```javascript
// Create BOD Member
const createBODMember = async (memberData) => {
  try {
    const response = await fetch('https://mandapam-backend-97mi.onrender.com/api/bod', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(memberData)
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error creating BOD member:', error);
    throw error;
  }
};

// Example usage
const memberData = {
  name: "Test BOD Member",
  designation: "President",
  contactNumber: "9876543210",
  email: "test@example.com",
  bio: "Test bio for BOD member",
  address: "Test address, Mumbai",
  city: "Mumbai",
  state: "Maharashtra",
  pincode: "400001",
  isActive: true,
  associationId: 7
};

createBODMember(memberData)
  .then(result => console.log('Success:', result))
  .catch(error => console.error('Error:', error));
```

---

## 📝 **Valid Designation Values**

| Designation | Description |
|-------------|-------------|
| `President` | Association President |
| `Vice President` | Association Vice President |
| `Secretary` | Association Secretary |
| `Joint Secretary` | Association Joint Secretary |
| `Treasurer` | Association Treasurer |
| `Joint Treasurer` | Association Joint Treasurer |
| `Executive Member` | Executive Board Member |
| `Member` | Board Member ✅ (Recently added) |

---

## 🔍 **Contact Number Format Examples**

The API accepts various contact number formats:

| Format | Example |
|--------|---------|
| Simple | `9876543210` |
| With Country Code | `+91-9876543210` |
| With Parentheses | `(987) 654-3210` |
| With Dashes | `987-654-3210` |
| With Spaces | `987 654 3210` |

---

## 🎯 **Best Practices**

1. **Always include required fields**: `name`, `designation`, `contactNumber`, `email`, `associationId`
2. **Use valid designation values**: Check the list above
3. **Handle errors gracefully**: Implement proper error handling for validation errors
4. **Store JWT tokens securely**: Use secure storage for authentication tokens
5. **Validate data on frontend**: Implement client-side validation before API calls
6. **Use pagination**: For large datasets, use `page` and `limit` parameters

---

## ✅ **API Status**

- **Status**: ✅ Working
- **Last Updated**: September 8, 2025
- **Version**: 1.0
- **Authentication**: ✅ Required (Admin)
- **Validation**: ✅ Fixed and Working
- **Database Mapping**: ✅ Corrected

---

## 🚀 **Ready for Production**

The BOD API is now fully functional with all validation issues resolved. You can use this API for:

- ✅ Creating new BOD members
- ✅ Retrieving BOD member lists
- ✅ Updating existing BOD members
- ✅ Deleting BOD members
- ✅ Filtering and searching BOD members

**Happy coding!** 🎉
