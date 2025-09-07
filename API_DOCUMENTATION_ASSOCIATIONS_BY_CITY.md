# Associations by City API Documentation

## New API Endpoint

### Get Associations by City
**Endpoint:** `GET /api/mobile/associations/city/:city`  
**Authentication:** Required (Bearer Token)  
**Access:** Private

#### Description
Retrieves a list of associations filtered by city name. This endpoint provides a dedicated way to find associations in a specific city with additional filtering and search capabilities.

#### URL Parameters
- `city` (string, required): The city name to filter associations by (case-insensitive partial match)

#### Query Parameters
- `page` (integer, optional): Page number for pagination (default: 1)
- `limit` (integer, optional): Number of results per page (default: 20)
- `search` (string, optional): Search term to filter associations by name or phone
- `state` (string, optional): Additional state filter for more precise results

#### Request Example
```http
GET /api/mobile/associations/city/Delhi?page=1&limit=10&search=Business
Authorization: Bearer <your-jwt-token>
```

#### Response Format
```json
{
  "success": true,
  "count": 5,
  "total": 12,
  "page": 1,
  "pages": 2,
  "city": "Delhi",
  "associations": [
    {
      "id": 1,
      "name": "Delhi Business Association",
      "description": "Leading business association in Delhi",
      "address": "123 Business Street",
      "city": "Delhi",
      "state": "Delhi",
      "pincode": "110001",
      "phone": "+91-11-12345678",
      "email": "info@delhibusiness.com",
      "website": "https://delhibusiness.com",
      "registrationNumber": "DL/2023/001",
      "establishedYear": 2023,
      "logo": "https://example.com/logo1.jpg",
      "isActive": true,
      "totalMembers": 150,
      "totalVendors": 45,
      "createdAt": "2023-01-15T10:30:00.000Z",
      "updatedAt": "2023-01-15T10:30:00.000Z"
    }
  ]
}
```

#### Response Fields
- `success` (boolean): Indicates if the request was successful
- `count` (integer): Number of associations in current page
- `total` (integer): Total number of associations matching the criteria
- `page` (integer): Current page number
- `pages` (integer): Total number of pages
- `city` (string): The city parameter used in the request
- `associations` (array): Array of association objects

#### Association Object Fields
- `id` (integer): Unique association identifier
- `name` (string): Association name
- `description` (string): Association description
- `address` (string): Physical address
- `city` (string): City name
- `state` (string): State name
- `pincode` (string): Postal code
- `phone` (string): Contact phone number
- `email` (string): Contact email
- `website` (string): Association website URL
- `registrationNumber` (string): Official registration number
- `establishedYear` (integer): Year of establishment
- `logo` (string): Logo image URL
- `isActive` (boolean): Association status
- `totalMembers` (integer): Number of members
- `totalVendors` (integer): Number of vendors
- `createdAt` (string): Creation timestamp
- `updatedAt` (string): Last update timestamp

#### Error Responses

**400 Bad Request**
```json
{
  "success": false,
  "message": "Invalid association ID format"
}
```

**401 Unauthorized**
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

**500 Internal Server Error**
```json
{
  "success": false,
  "message": "Server error while fetching associations by city"
}
```

#### Usage Examples

1. **Get all associations in Delhi:**
   ```http
   GET /api/mobile/associations/city/Delhi
   ```

2. **Get associations in Mumbai with pagination:**
   ```http
   GET /api/mobile/associations/city/Mumbai?page=2&limit=5
   ```

3. **Search for business associations in Delhi:**
   ```http
   GET /api/mobile/associations/city/Delhi?search=Business
   ```

4. **Get associations in Delhi, Delhi state:**
   ```http
   GET /api/mobile/associations/city/Delhi?state=Delhi
   ```

#### Features
- **Case-insensitive city matching**: Searches for partial matches in city names
- **Pagination support**: Efficient handling of large result sets
- **Search functionality**: Filter results by association name or phone
- **State filtering**: Additional geographic filtering capability
- **Active associations only**: Returns only active associations
- **Sorted results**: Results are sorted alphabetically by association name

#### Integration Notes
- This endpoint complements the existing `/api/mobile/associations` endpoint
- Use this endpoint when you specifically need to filter by city
- The existing endpoint supports city filtering via query parameters but this provides a more explicit URL structure
- Both endpoints return the same data format for consistency

