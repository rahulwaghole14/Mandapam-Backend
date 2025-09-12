# 📱 Mobile App API Integration Guide

## 🎯 **Overview**
This guide provides the mobile app team with the updated API endpoints and response formats for the Mandap Association Platform.

---

## 🔧 **Key Changes Made**

### **✅ BOD API (`/api/bod`)**
- **Now supports both web and mobile tokens**
- **Returns dual format**: Both web fields (`id`, `position`, `phone`) and mobile fields (`_id`, `designation`, `contactNumber`)
- **Mobile app should use**: `_id`, `designation`, `contactNumber`, `associationName`

### **✅ Members API (`/api/mobile/members`)**
- **Updated response format** with correct field names
- **Mobile app should use**: `_id`, `associationName`, `paymentStatus`, `isMobileVerified`

### **✅ Association API (`/api/mobile/associations/:id`)**
- **Added `memberCount` field** for real-time member count

---

## 📋 **API Endpoints for Mobile App**

### **1. Board of Directors (BOD)**

#### **Get All BOD Members**
```http
GET /api/bod?page=1&limit=50&designation=President
Authorization: Bearer <mobile_token>
```

**Response Format:**
```json
{
  "success": true,
  "bods": [
    {
      // Web fields (ignore these)
      "id": 32,
      "position": "Vice President",
      "phone": "9881976526",
      
      // Mobile fields (use these)
      "_id": "32",
      "designation": "Vice President",
      "contactNumber": "9881976526",
      "associationName": "National Board"
    }
  ],
  "total": 10,
  "page": 1,
  "hasNextPage": false
}
```

**Mobile App Usage:**
```javascript
// Use these fields in your mobile app
const bodMember = response.data.bods[0];
console.log(bodMember._id);           // "32" (string)
console.log(bodMember.designation);   // "Vice President"
console.log(bodMember.contactNumber); // "9881976526"
console.log(bodMember.associationName); // "National Board"
```

---

### **2. Members**

#### **Get All Members**
```http
GET /api/mobile/members?page=1&limit=50&businessType=catering&paymentStatus=Paid
Authorization: Bearer <mobile_token>
```

**Response Format:**
```json
{
  "success": true,
  "members": [
    {
      "_id": "15",
      "name": "rahul waghole",
      "businessName": "RSL Solution Pvt Ltd",
      "businessType": "catering",
      "phone": "9881976526",
      "city": "Pune",
      "state": "Maharashtra",
      "pincode": "411001",
      "associationName": "Raigad Association",
      "profileImage": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face&sig=15",
      "isActive": true,
      "isMobileVerified": true,
      "paymentStatus": "Paid",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 25,
  "page": 1,
  "limit": 50,
  "hasNextPage": false
}
```

**Mobile App Usage:**
```javascript
// Use these fields in your mobile app
const member = response.data.members[0];
console.log(member._id);              // "15" (string)
console.log(member.associationName);  // "Raigad Association"
console.log(member.paymentStatus);    // "Paid"
console.log(member.isMobileVerified); // true
```

---

### **3. Associations**

#### **Get Association Details**
```http
GET /api/mobile/associations/8
Authorization: Bearer <mobile_token>
```

**Response Format:**
```json
{
  "success": true,
  "association": {
    "id": 8,
    "name": "Ahmednagar Association",
    "city": "Ahmednagar",
    "state": "Maharashtra",
    "memberCount": 12  // ✅ New field added
  }
}
```

**Mobile App Usage:**
```javascript
// Use the memberCount field
const association = response.data.association;
console.log(association.memberCount); // 12 (number)
```

---

## 🧪 **Testing the APIs**

### **Postman Collection**
Import the `Mobile_App_API_Collection.json` file into Postman to test all endpoints.

### **Test Script**
Use the provided test script to verify API responses:

```bash
# Update the production URL in the script
node test_production_apis.js
```

---

## 🔍 **Troubleshooting**

### **If Mobile App Shows Fallback Data:**

1. **Check API Response:**
   ```javascript
   // Verify the response structure
   console.log('BOD Response:', response.data);
   console.log('Has bods array:', response.data.bods);
   console.log('First BOD member:', response.data.bods[0]);
   ```

2. **Verify Field Names:**
   ```javascript
   // Check if mobile fields are present
   const firstBod = response.data.bods[0];
   console.log('_id:', firstBod._id);
   console.log('designation:', firstBod.designation);
   console.log('contactNumber:', firstBod.contactNumber);
   ```

3. **Check Authentication:**
   ```javascript
   // Verify token is valid
   console.log('Token:', mobileAuthToken);
   console.log('Response status:', response.status);
   ```

### **Common Issues:**

1. **Wrong Field Names:**
   - ❌ Don't use: `id`, `position`, `phone`
   - ✅ Use: `_id`, `designation`, `contactNumber`

2. **Data Type Issues:**
   - ❌ Don't expect: `id` as number
   - ✅ Expect: `_id` as string

3. **Missing Fields:**
   - ✅ Check for: `associationName`, `paymentStatus`, `memberCount`

---

## 📱 **Mobile App Integration Checklist**

### **BOD Page:**
- [ ] Use `_id` instead of `id`
- [ ] Use `designation` instead of `position`
- [ ] Use `contactNumber` instead of `phone`
- [ ] Display `associationName` for filtering

### **Members Page:**
- [ ] Use `_id` instead of `id`
- [ ] Use `associationName` for association filtering
- [ ] Use `paymentStatus` for payment status display
- [ ] Use `isMobileVerified` for verification status

### **Association Details Page:**
- [ ] Use `memberCount` field for member count display
- [ ] Verify the count is a number, not string

---

## 🚀 **Production Deployment**

### **Server Requirements:**
- ✅ **Server restarted** to pick up code changes
- ✅ **Database connection** working
- ✅ **Environment variables** set correctly

### **API Testing:**
- ✅ **Authentication** working with mobile tokens
- ✅ **Response format** matches expected structure
- ✅ **Field names** are correct for mobile app

---

## 📞 **Support**

### **If Issues Persist:**
1. **Check server logs** for any errors
2. **Verify database** has the required data
3. **Test with Postman** collection first
4. **Contact backend team** with specific error details

### **API Status:**
- ✅ **BOD API**: Working with dual format
- ✅ **Members API**: Working with mobile format
- ✅ **Association API**: Working with memberCount
- ✅ **Authentication**: Working with mobile tokens

---

**Last Updated**: January 2025  
**Version**: 2.0.0  
**Status**: ✅ Ready for Production
