# 📋 BOD & NBOD API Documentation

## 🔐 Authentication
All BOD/NBOD APIs require authentication:
- **Header**: `Authorization: Bearer <jwt_token>`
- **Access Level**: Admin only for create/update/delete operations

---

## 📊 **BOD/NBOD API Endpoints**

### 1. **Get All BOD Members** 
```http
GET /api/bod
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)
- `search` (optional): Search by name, designation, or email
- `designation` (optional): Filter by designation
- `isActive` (optional): Filter by active status (true/false)
- `type` (optional): Filter by type - `association` or `national`
- `associationId` (optional): Filter by specific association ID
- `sortBy` (optional): Sort field - `name`, `designation`, `dateOfJoining`, `created_at`
- `sortOrder` (optional): Sort order - `asc` or `desc`

**Example Requests:**
```http
# Get all BOD members
GET /api/bod

# Get Association BODs only
GET /api/bod?type=association

# Get National BODs only
GET /api/bod?type=national

# Get BODs for specific association
GET /api/bod?associationId=7

# Search BOD members
GET /api/bod?search=President&page=1&limit=20

# Filter by designation
GET /api/bod?designation=President&isActive=true
```

**Response:**
```json
{
  "success": true,
  "count": 5,
  "total": 25,
  "page": 1,
  "totalPages": 3,
  "hasNextPage": true,
  "hasPrevPage": false,
  "type": "association",
  "associationId": 7,
  "bods": [
    {
      "id": 1,
      "name": "John Doe",
      "designation": "President",
      "email": "john@example.com",
      "contactNumber": "9876543210",
      "address": "123 Main Street",
      "city": "Mumbai",
      "state": "Maharashtra",
      "pincode": "400001",
      "profileImage": null,
      "bio": "BOD member bio",
      "experience": 5,
      "termStart": "2024-01-01",
      "termEnd": "2026-12-31",
      "isActive": true,
      "associationId": 7,
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 2. **Get Association BOD Members**
```http
GET /api/bod/association/:associationId
```

**Path Parameters:**
- `associationId` (required): Association ID

**Query Parameters:**
- `page`, `limit`, `search`, `designation`, `isActive`, `sortBy`, `sortOrder`

**Example:**
```http
GET /api/bod/association/7?page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "total": 3,
  "page": 1,
  "totalPages": 1,
  "hasNextPage": false,
  "hasPrevPage": false,
  "associationId": 7,
  "type": "association",
  "bods": [...]
}
```

---

### 3. **Get National BOD Members**
```http
GET /api/bod/national
```

**Query Parameters:**
- `page`, `limit`, `search`, `designation`, `isActive`, `sortBy`, `sortOrder`

**Example:**
```http
GET /api/bod/national?page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "total": 2,
  "page": 1,
  "totalPages": 1,
  "hasNextPage": false,
  "hasPrevPage": false,
  "type": "national",
  "bods": [...]
}
```

---

### 4. **Get Single BOD Member**
```http
GET /api/bod/:id
```

**Path Parameters:**
- `id` (required): BOD member ID

**Example:**
```http
GET /api/bod/1
```

**Response:**
```json
{
  "success": true,
  "bod": {
    "id": 1,
    "name": "John Doe",
    "designation": "President",
    "email": "john@example.com",
    "contactNumber": "9876543210",
    "address": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "profileImage": null,
    "bio": "BOD member bio",
    "experience": 5,
    "termStart": "2024-01-01",
    "termEnd": "2026-12-31",
    "isActive": true,
    "associationId": 7,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 5. **Create BOD Member** ⚠️ **Admin Only**
```http
POST /api/bod
```

**Request Body:**
```json
{
  "name": "John Doe",
  "designation": "President",
  "contactNumber": "9876543210",
  "email": "john@example.com",
  "address": "123 Main Street",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "bio": "BOD member bio",
  "experience": 5,
  "termStart": "2024-01-01",
  "termEnd": "2026-12-31",
  "isActive": true,
  "associationId": 7
}
```

**Field Mapping Support:**
- `position` → `designation` (alternative field name)
- `phone` → `contactNumber` (alternative field name)

**Association vs National BOD:**
- **Association BOD**: Include `associationId` field
- **National BOD**: Omit `associationId` field (will be set to null)

**Example - Association BOD:**
```json
{
  "name": "Association BOD Member",
  "designation": "President",
  "contactNumber": "9876543210",
  "email": "association@example.com",
  "associationId": 7
}
```

**Example - National BOD:**
```json
{
  "name": "National BOD Member",
  "designation": "President",
  "contactNumber": "9876543211",
  "email": "national@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "bod": {
    "id": 1,
    "name": "John Doe",
    "designation": "President",
    "email": "john@example.com",
    "contactNumber": "9876543210",
    "address": "123 Main Street",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "profileImage": null,
    "bio": "BOD member bio",
    "experience": 5,
    "termStart": "2024-01-01",
    "termEnd": "2026-12-31",
    "isActive": true,
    "associationId": 7,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 6. **Update BOD Member** ⚠️ **Admin Only**
```http
PUT /api/bod/:id
```

**Path Parameters:**
- `id` (required): BOD member ID

**Request Body:** (All fields optional)
```json
{
  "name": "Updated Name",
  "designation": "Vice President",
  "contactNumber": "9876543210",
  "email": "updated@example.com",
  "address": "Updated Address",
  "city": "Pune",
  "state": "Maharashtra",
  "pincode": "411001",
  "bio": "Updated bio",
  "experience": 7,
  "termStart": "2024-01-01",
  "termEnd": "2026-12-31",
  "isActive": true
}
```

**Response:**
```json
{
  "success": true,
  "bod": {
    "id": 1,
    "name": "Updated Name",
    "designation": "Vice President",
    "email": "updated@example.com",
    "contactNumber": "9876543210",
    "address": "Updated Address",
    "city": "Pune",
    "state": "Maharashtra",
    "pincode": "411001",
    "profileImage": null,
    "bio": "Updated bio",
    "experience": 7,
    "termStart": "2024-01-01",
    "termEnd": "2026-12-31",
    "isActive": true,
    "associationId": 7,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T12:00:00.000Z"
  }
}
```

---

### 7. **Delete BOD Member** ⚠️ **Admin Only**
```http
DELETE /api/bod/:id
```

**Path Parameters:**
- `id` (required): BOD member ID

**Response:**
```json
{
  "success": true,
  "message": "BOD member deleted successfully"
}
```

---

### 8. **Toggle BOD Status** ⚠️ **Admin Only**
```http
PUT /api/bod/:id/toggle-status
```

**Path Parameters:**
- `id` (required): BOD member ID

**Response:**
```json
{
  "success": true,
  "bod": {
    "id": 1,
    "name": "John Doe",
    "designation": "President",
    "isActive": false,
    "dateOfResignation": "2024-01-01T00:00:00.000Z"
  },
  "message": "BOD member deactivated successfully"
}
```

---

### 9. **Get BOD Statistics**
```http
GET /api/bod/stats/overview
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "total": 25,
    "active": 20,
    "inactive": 5,
    "designations": [
      { "designation": "President", "count": 5 },
      { "designation": "Vice President", "count": 4 },
      { "designation": "Secretary", "count": 3 }
    ],
    "recent": [
      {
        "name": "New BOD Member",
        "designation": "Executive Member",
        "created_at": "2024-01-01T00:00:00.000Z"
      }
    ]
  }
}
```

---

## 🔧 **Field Validation Rules**

### **Required Fields:**
- `name`: BOD member name (required)
- `email`: Valid email address (required)
- Either `designation` OR `position` (required)
- Either `contactNumber` OR `phone` (required)

### **Optional Fields:**
- `address`: Max 500 characters
- `city`: Max 100 characters
- `state`: Max 100 characters
- `pincode`: 6 digits
- `bio`: Max 500 characters
- `experience`: Integer
- `termStart`: Date
- `termEnd`: Date
- `isActive`: Boolean (default: true)
- `associationId`: Integer (for Association BODs)

### **Designation Options:**
- `President`
- `Vice President`
- `Secretary`
- `Joint Secretary`
- `Treasurer`
- `Joint Treasurer`
- `Executive Member`

### **Social Links (Optional):**
- `socialLinks.linkedin`: Valid URL
- `socialLinks.twitter`: Valid URL
- `socialLinks.facebook`: Valid URL

---

## 🎯 **BOD vs NBOD Differentiation**

### **Association BOD (BOD):**
- Has `associationId` field populated
- Belongs to a specific association
- Filter with `type=association` or `associationId=X`

### **National BOD (NBOD):**
- Has `associationId` field as `null`
- Represents national-level board members
- Filter with `type=national`

---

## 📱 **Frontend Integration Examples**

### **JavaScript/React:**
```javascript
// Get all BOD members
const getBODMembers = async () => {
  const response = await fetch('/api/bod', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
};

// Create Association BOD
const createAssociationBOD = async (bodData) => {
  const response = await fetch('/api/bod', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ...bodData,
      associationId: 7 // For Association BOD
    })
  });
  return response.json();
};

// Create National BOD
const createNationalBOD = async (bodData) => {
  const response = await fetch('/api/bod', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(bodData) // No associationId for National BOD
  });
  return response.json();
};
```

---

## ⚠️ **Error Responses**

### **Validation Error (400):**
```json
{
  "success": false,
  "errors": [
    {
      "type": "field",
      "msg": "Designation is required",
      "path": "designation",
      "location": "body"
    }
  ]
}
```

### **Not Found (404):**
```json
{
  "success": false,
  "message": "BOD member not found"
}
```

### **Unauthorized (401):**
```json
{
  "success": false,
  "message": "Not authorized, token failed"
}
```

### **Forbidden (403):**
```json
{
  "success": false,
  "message": "Not authorized to access this route"
}
```

### **Server Error (500):**
```json
{
  "success": false,
  "message": "Server error while creating BOD member"
}
```

---

## 🚀 **Quick Start Guide**

1. **Get BOD List**: `GET /api/bod`
2. **Filter by Type**: `GET /api/bod?type=association` or `GET /api/bod?type=national`
3. **Create BOD**: `POST /api/bod` with appropriate data
4. **Update BOD**: `PUT /api/bod/:id`
5. **Delete BOD**: `DELETE /api/bod/:id`

---

**Last Updated**: January 8, 2025  
**Status**: ✅ All APIs Working Perfectly
