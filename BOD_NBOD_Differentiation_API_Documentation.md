# BOD vs NBOD Differentiation API Documentation

## Overview
This document outlines the API endpoints and functionality for differentiating between **Association BODs** and **National BODs** in the Mandap Association Platform.

## Key Concepts

### Association BODs
- **Scope**: Local to a specific association
- **Database**: `associationId` field contains the association ID
- **Source**: Created from Association Members detail page
- **Purpose**: Manage board members for individual associations

### National BODs (NBOD)
- **Scope**: National/Global level
- **Database**: `associationId` field is `null`
- **Source**: Created from NBOD page in navigation
- **Purpose**: Manage board members at the national level

## API Endpoints

### 1. Get All BOD Members (Enhanced)
**Route**: `GET /api/bod`

**Query Parameters**:
- `type` (optional): `association` | `national` - Filter by BOD type
- `associationId` (optional): Integer - Filter by specific association ID
- `page` (optional): Integer - Page number (default: 1)
- `limit` (optional): Integer - Items per page (default: 10)
- `search` (optional): String - Search by name, designation, or email
- `designation` (optional): String - Filter by designation
- `isActive` (optional): Boolean - Filter by active status
- `sortBy` (optional): String - Sort field (default: created_at)
- `sortOrder` (optional): String - Sort order: `asc` | `desc` (default: desc)

**Examples**:
```bash
# Get all BODs
GET /api/bod

# Get only Association BODs
GET /api/bod?type=association

# Get only National BODs
GET /api/bod?type=national

# Get BODs for specific association
GET /api/bod?associationId=7

# Get Association BODs with search
GET /api/bod?type=association&search=president&page=1&limit=5
```

**Response**:
```json
{
  "success": true,
  "count": 5,
  "total": 25,
  "page": 1,
  "totalPages": 5,
  "hasNextPage": true,
  "hasPrevPage": false,
  "type": "association", // Only present when type filter is used
  "associationId": 7,    // Only present when associationId filter is used
  "bods": [
    {
      "id": 1,
      "name": "John Doe",
      "designation": "President",
      "email": "john@example.com",
      "contactNumber": "9876543210",
      "associationId": 7, // null for National BODs
      "isActive": true,
      "created_at": "2025-01-08T10:00:00.000Z",
      "updated_at": "2025-01-08T10:00:00.000Z"
    }
  ]
}
```

### 2. Get BODs by Specific Association
**Route**: `GET /api/bod/association/:associationId`

**Parameters**:
- `associationId` (required): Integer - Association ID

**Query Parameters**: Same as above (except `type` and `associationId`)

**Example**:
```bash
GET /api/bod/association/7?page=1&limit=10&search=president
```

**Response**:
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

### 3. Get National BODs (Dedicated Route)
**Route**: `GET /api/bod/national`

**Query Parameters**: Same as above (except `type` and `associationId`)

**Example**:
```bash
GET /api/bod/national?page=1&limit=10&designation=President
```

**Response**:
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

### 4. Create BOD Member
**Route**: `POST /api/bod`

**Request Body**:

#### For Association BOD:
```json
{
  "name": "Association BOD Member",
  "designation": "President",
  "contactNumber": "9876543210",
  "email": "association@example.com",
  "bio": "Association BOD member bio",
  "address": "Association address, Mumbai",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "isActive": true,
  "associationId": 7  // Required for Association BOD
}
```

#### For National BOD:
```json
{
  "name": "National BOD Member",
  "designation": "President",
  "contactNumber": "9876543211",
  "email": "national@mandap.com",
  "bio": "National BOD member bio",
  "address": "National office address, Mumbai",
  "city": "Mumbai",
  "state": "Maharashtra",
  "pincode": "400001",
  "isActive": true
  // No associationId - will be set to null automatically
}
```

**Response**:
```json
{
  "success": true,
  "bod": {
    "id": 15,
    "name": "Association BOD Member",
    "designation": "President",
    "email": "association@example.com",
    "contactNumber": "9876543210",
    "associationId": 7, // null for National BODs
    "isActive": true,
    "created_at": "2025-01-08T10:00:00.000Z",
    "updated_at": "2025-01-08T10:00:00.000Z"
  }
}
```

## Database Schema

### BOD Table Structure
```sql
CREATE TABLE board_of_directors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  position VARCHAR(100) NOT NULL, -- Maps to 'designation' in model
  phone VARCHAR(15),              -- Maps to 'contactNumber' in model
  email VARCHAR(100),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  pincode VARCHAR(10),
  profile_image VARCHAR(255),
  bio TEXT,
  experience INTEGER,
  term_start DATE,
  term_end DATE,
  is_active BOOLEAN DEFAULT true,
  association_id INTEGER NULL,    -- NULL for National BODs
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (association_id) REFERENCES associations(id)
);
```

### Key Points:
- `association_id` is **NULLABLE** - allows National BODs
- `association_id` contains association ID for Association BODs
- `association_id` is `NULL` for National BODs

## Frontend Integration

### Association BOD Manager
**File**: `src/components/AssociationBODManager.jsx`

**API Calls**:
```javascript
// Get BODs for specific association
GET /api/bod/association/7

// Create Association BOD
POST /api/bod
{
  ...bodData,
  associationId: 7  // Always include associationId
}
```

### National BOD Manager
**File**: `src/pages/BODList.jsx`

**API Calls**:
```javascript
// Get National BODs
GET /api/bod/national

// Create National BOD
POST /api/bod
{
  ...bodData
  // Never include associationId
}
```

## Validation Rules

### Designation Validation
Allowed values:
- `President`
- `Vice President`
- `Secretary`
- `Joint Secretary`
- `Treasurer`
- `Joint Treasurer`
- `Executive Member`
- `Member` (if needed)

### Required Fields
- `name` (String, 2-100 characters)
- `designation` (String, from allowed values)
- `contactNumber` (String, matches phone number pattern)
- `email` (String, valid email format)

### Optional Fields
- `bio` (String, max 500 characters)
- `address` (String, max 500 characters)
- `city` (String, max 100 characters)
- `state` (String, max 100 characters)
- `pincode` (String, 6 digits)
- `associationId` (Integer, required for Association BODs, null for National BODs)

## Testing Examples

### Test Case 1: Create Association BOD
```bash
curl -X POST https://mandapam-backend-97mi.onrender.com/api/bod \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Association BOD",
    "designation": "President",
    "contactNumber": "9876543210",
    "email": "test@association.com",
    "associationId": 7
  }'
```

**Expected Result**: BOD created with `associationId: 7`

### Test Case 2: Create National BOD
```bash
curl -X POST https://mandapam-backend-97mi.onrender.com/api/bod \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test National BOD",
    "designation": "President",
    "contactNumber": "9876543211",
    "email": "test@national.com"
  }'
```

**Expected Result**: BOD created with `associationId: null`

### Test Case 3: Get Association BODs
```bash
curl -X GET "https://mandapam-backend-97mi.onrender.com/api/bod?type=association" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Result**: Returns only BODs with non-null `associationId`

### Test Case 4: Get National BODs
```bash
curl -X GET "https://mandapam-backend-97mi.onrender.com/api/bod?type=national" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Result**: Returns only BODs with null `associationId`

## Error Handling

### Common Errors

#### 1. Missing Association ID for Association BOD
```json
{
  "success": false,
  "message": "Association ID is required for Association BODs"
}
```

#### 2. Invalid Association ID
```json
{
  "success": false,
  "message": "Valid association ID is required"
}
```

#### 3. Invalid BOD Type
```json
{
  "success": false,
  "errors": [
    {
      "msg": "Type must be either association or national",
      "param": "type",
      "location": "query"
    }
  ]
}
```

## Migration Notes

### Existing Data
If you have existing BOD data that needs to be migrated:

1. **Association BODs**: Ensure they have valid `associationId` values
2. **National BODs**: Set their `associationId` to `null`

### Migration Script Example
```javascript
// Update existing National BODs to have null associationId
await BOD.update(
  { associationId: null },
  { 
    where: { 
      // Add criteria for National BODs
      // Example: specific IDs or other conditions
    }
  }
);
```

## Summary

The BOD vs NBOD differentiation is now fully implemented with:

✅ **Model Support**: `associationId` is optional in BOD model
✅ **Enhanced GET Route**: Supports filtering by type and associationId
✅ **Dedicated Routes**: Separate routes for Association and National BODs
✅ **Proper Validation**: Handles both types correctly
✅ **Complete API Coverage**: All CRUD operations support both types
✅ **Postman Collection**: Updated with all new endpoints
✅ **Documentation**: Comprehensive API documentation

The system now seamlessly handles both Association BODs (with `associationId`) and National BODs (without `associationId`) using the same API endpoints with proper filtering and validation.

---

**Last Updated**: January 8, 2025  
**Version**: 1.0  
**Status**: ✅ Implemented and Ready for Use
