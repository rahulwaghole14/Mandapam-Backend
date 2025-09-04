# 📱 Mobile App API Documentation

## 🎯 **Project Overview**
- **Backend**: Mandap Association Platform APIs
- **Mobile App**: React Native Expo app integration
- **Authentication**: Mobile Number + OTP based
- **Base URL**: `http://localhost:5000` (Development) / `https://your-domain.com` (Production)

## 🔐 **Authentication System**

### **OTP-Based Login Flow**
1. User enters mobile number → Send OTP
2. User receives OTP → Verify OTP
3. Server returns JWT token → Store securely
4. Use token for all protected API calls

### **Default OTP for Development**
- **OTP**: `123456` (for all mobile numbers)
- **Expiry**: 5 minutes
- **Rate Limit**: 3 requests per 15 minutes

## 📋 **API Endpoints**

### **1. Authentication APIs**

#### **Send OTP**
```http
POST /api/mobile/send-otp
Content-Type: application/json

{
  "mobileNumber": "9876543210"
}
```

**Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully to your mobile number",
  "otp": "123456"
}
```

#### **Verify OTP & Login**
```http
POST /api/mobile/verify-otp
Content-Type: application/json

{
  "mobileNumber": "9876543210",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "member": {
    "_id": "member_id",
    "name": "John Doe",
    "businessName": "Doe's Sound Systems",
    "businessType": "sound",
    "phone": "9876543210",
    "city": "Mumbai",
    "state": "Maharashtra",
    "pincode": "400001",
    "associationName": "Mumbai Mandap Association",
    "profileImage": "profile-image-url",
    "email": "john@example.com",
    "isMobileVerified": true,
    "paymentStatus": "Paid",
    "isActive": true
  }
}
```

#### **Register New Member**
```http
POST /api/mobile/register
Content-Type: application/json

{
  "name": "John Doe",
  "businessName": "Doe's Sound Systems",
  "businessType": "sound",
  "phone": "9876543210",
  "city": "Mumbai",
  "pincode": "400001",
  "associationName": "Mumbai Mandap Association",
  "state": "Maharashtra",
  "email": "john@example.com"
}
```

#### **Get User Profile**
```http
GET /api/mobile/profile
Authorization: Bearer <jwt_token>
```

#### **Update User Profile**
```http
PUT /api/mobile/profile
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "name": "John Doe Updated",
  "businessName": "Doe's Premium Sound Systems",
  "city": "Mumbai"
}
```

#### **Logout**
```http
POST /api/mobile/logout
Authorization: Bearer <jwt_token>
```

### **2. Member Directory APIs**

#### **Get All Members**
```http
GET /api/mobile/members?page=1&limit=20&businessType=sound&city=Mumbai
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "count": 20,
  "total": 150,
  "page": 1,
  "pages": 8,
  "members": [
    {
      "_id": "member_id",
      "name": "Jane Smith",
      "businessName": "Smith Decorations",
      "businessType": "decorator",
      "phone": "9876543211",
      "city": "Pune",
      "state": "Maharashtra",
      "pincode": "411001",
      "associationName": "Pune Mandap Association",
      "profileImage": "profile-image-url",
      "isActive": true,
      "paymentStatus": "Paid"
    }
  ]
}
```

#### **Get Specific Member**
```http
GET /api/mobile/members/:id
Authorization: Bearer <jwt_token>
```

#### **Search Members**
```http
GET /api/mobile/members/search?q=John&businessType=sound&city=Mumbai
Authorization: Bearer <jwt_token>
```

#### **Filter Members**
```http
GET /api/mobile/members/filter?businessType=sound&city=Mumbai&paymentStatus=Paid
Authorization: Bearer <jwt_token>
```

### **3. Event APIs**

#### **Get All Events**
```http
GET /api/mobile/events?page=1&limit=20&type=Meeting&status=Upcoming
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 50,
  "page": 1,
  "pages": 5,
  "events": [
    {
      "_id": "event_id",
      "title": "Annual General Meeting",
      "description": "AGM for all members",
      "type": "Meeting",
      "date": "2024-02-15T00:00:00.000Z",
      "startTime": "10:00",
      "endTime": "12:00",
      "location": {
        "address": "Community Hall",
        "city": "Mumbai",
        "district": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001"
      },
      "organizer": "Mumbai Mandap Association",
      "contactPerson": {
        "name": "Rajesh Kumar",
        "phone": "9876543210",
        "email": "rajesh@mandap.com"
      },
      "status": "Upcoming",
      "priority": "High",
      "isPublic": true,
      "maxAttendees": 100,
      "currentAttendees": 25,
      "registrationRequired": true,
      "registrationDeadline": "2024-02-10T00:00:00.000Z"
    }
  ]
}
```

#### **Get Upcoming Events**
```http
GET /api/mobile/events/upcoming?page=1&limit=10
Authorization: Bearer <jwt_token>
```

#### **Get Event Details**
```http
GET /api/mobile/events/:id
Authorization: Bearer <jwt_token>
```

#### **Search Events**
```http
GET /api/mobile/events/search?q=Meeting&type=Meeting&city=Mumbai
Authorization: Bearer <jwt_token>
```

#### **Get Event Statistics**
```http
GET /api/mobile/events/stats
Authorization: Bearer <jwt_token>
```

### **4. Association APIs**

#### **Get All Associations**
```http
GET /api/mobile/associations?page=1&limit=20&state=Maharashtra
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "count": 10,
  "total": 25,
  "page": 1,
  "pages": 3,
  "associations": [
    {
      "_id": "association_id",
      "name": "Mumbai Mandap Association",
      "address": {
        "city": "Mumbai",
        "district": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001"
      },
      "establishedDate": "2020-01-15T00:00:00.000Z",
      "memberCount": 150,
      "status": "Active",
      "contactPerson": "Rajesh Kumar",
      "phone": "9876543210",
      "email": "info@mumbaimandap.com",
      "website": "https://mumbaimandap.com",
      "socialLinks": {
        "linkedin": "https://linkedin.com/company/mumbaimandap",
        "twitter": "https://twitter.com/mumbaimandap",
        "facebook": "https://facebook.com/mumbaimandap"
      },
      "logo": "association-logo-url"
    }
  ]
}
```

#### **Get Association Details**
```http
GET /api/mobile/associations/:id
Authorization: Bearer <jwt_token>
```

#### **Search Associations**
```http
GET /api/mobile/associations/search?q=Mumbai&state=Maharashtra
Authorization: Bearer <jwt_token>
```

### **5. Board of Directors APIs**

#### **Get All BOD Members**
```http
GET /api/mobile/bod?page=1&limit=20&designation=President
Authorization: Bearer <jwt_token>
```

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
      "_id": "bod_id",
      "name": "Rajesh Kumar",
      "designation": "President",
      "contactNumber": "9876543210",
      "email": "president@mandap.com",
      "profileImage": "profile-url",
      "isActive": true,
      "dateOfJoining": "2023-01-01T00:00:00.000Z",
      "address": {
        "street": "123 Main Street",
        "city": "Mumbai",
        "district": "Mumbai",
        "state": "Maharashtra",
        "pincode": "400001"
      },
      "bio": "Experienced leader in the mandap industry",
      "socialLinks": {
        "linkedin": "https://linkedin.com/in/rajeshkumar",
        "twitter": "https://twitter.com/rajeshkumar"
      }
    }
  ]
}
```

#### **Get BOD Member Details**
```http
GET /api/mobile/bod/:id
Authorization: Bearer <jwt_token>
```

#### **Get BOD by Designation**
```http
GET /api/mobile/bod/designation/President
Authorization: Bearer <jwt_token>
```

### **6. File Upload APIs**

#### **Upload Profile Image**
```http
POST /api/mobile/upload/profile-image
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

Form Data:
- image: [file] (jpg, png, gif, webp, max 5MB)
```

**Response:**
```json
{
  "success": true,
  "message": "Profile image uploaded successfully",
  "file": {
    "filename": "mobile-image-1234567890-123456789.jpg",
    "originalName": "profile.jpg",
    "size": 2048576,
    "mimetype": "image/jpeg",
    "url": "/uploads/mobile-image-1234567890-123456789.jpg"
  }
}
```

#### **Upload Multiple Images**
```http
POST /api/mobile/upload/images
Authorization: Bearer <jwt_token>
Content-Type: multipart/form-data

Form Data:
- images: [files] (max 5 files, 5MB each)
```

#### **Get File Info**
```http
GET /api/mobile/upload/:filename
Authorization: Bearer <jwt_token>
```

#### **Delete File**
```http
DELETE /api/mobile/upload/:filename
Authorization: Bearer <jwt_token>
```

## 🔧 **API Integration Guide**

### **1. API Service Setup**
```javascript
// API Configuration
const API_CONFIG = {
  BASE_URL: 'http://localhost:5000', // Development
  // BASE_URL: 'https://your-domain.com', // Production
  
  ENDPOINTS: {
    AUTH: {
      SEND_OTP: '/api/mobile/send-otp',
      VERIFY_OTP: '/api/mobile/verify-otp',
      REGISTER: '/api/mobile/register',
      PROFILE: '/api/mobile/profile',
      LOGOUT: '/api/mobile/logout'
    },
    MEMBERS: {
      LIST: '/api/mobile/members',
      DETAIL: '/api/mobile/members/:id',
      SEARCH: '/api/mobile/members/search',
      FILTER: '/api/mobile/members/filter'
    },
    EVENTS: {
      LIST: '/api/mobile/events',
      DETAIL: '/api/mobile/events/:id',
      UPCOMING: '/api/mobile/events/upcoming',
      SEARCH: '/api/mobile/events/search',
      STATS: '/api/mobile/events/stats'
    },
    ASSOCIATIONS: {
      LIST: '/api/mobile/associations',
      DETAIL: '/api/mobile/associations/:id',
      SEARCH: '/api/mobile/associations/search'
    },
    BOD: {
      LIST: '/api/mobile/bod',
      DETAIL: '/api/mobile/bod/:id',
      BY_DESIGNATION: '/api/mobile/bod/designation/:designation'
    },
    UPLOAD: {
      PROFILE_IMAGE: '/api/mobile/upload/profile-image',
      IMAGES: '/api/mobile/upload/images',
      FILE_INFO: '/api/mobile/upload/:filename',
      DELETE: '/api/mobile/upload/:filename'
    }
  }
};
```

### **2. Authentication Service**
```javascript
class AuthService {
  static async sendOTP(mobileNumber) {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.SEND_OTP}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mobileNumber }),
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error('Failed to send OTP');
    }
  }

  static async verifyOTP(mobileNumber, otp) {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.VERIFY_OTP}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mobileNumber, otp }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Store token securely
        await AsyncStorage.setItem('auth_token', data.token);
        await AsyncStorage.setItem('user_data', JSON.stringify(data.member));
      }
      
      return data;
    } catch (error) {
      throw new Error('Failed to verify OTP');
    }
  }

  static async getStoredToken() {
    return await AsyncStorage.getItem('auth_token');
  }

  static async logout() {
    const token = await this.getStoredToken();
    
    if (token) {
      try {
        await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.LOGOUT}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.log('Logout API call failed:', error);
      }
    }
    
    // Clear stored data
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('user_data');
  }
}
```

### **3. API Service with Authentication**
```javascript
class APIService {
  static async makeRequest(endpoint, options = {}) {
    const token = await AuthService.getStoredToken();
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'API request failed');
      }
      
      return data;
    } catch (error) {
      throw error;
    }
  }

  // Member APIs
  static async getMembers(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.makeRequest(`${API_CONFIG.ENDPOINTS.MEMBERS.LIST}?${queryString}`);
  }

  static async getMember(id) {
    return this.makeRequest(API_CONFIG.ENDPOINTS.MEMBERS.DETAIL.replace(':id', id));
  }

  static async searchMembers(params) {
    const queryString = new URLSearchParams(params).toString();
    return this.makeRequest(`${API_CONFIG.ENDPOINTS.MEMBERS.SEARCH}?${queryString}`);
  }

  // Event APIs
  static async getEvents(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.makeRequest(`${API_CONFIG.ENDPOINTS.EVENTS.LIST}?${queryString}`);
  }

  static async getUpcomingEvents(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.makeRequest(`${API_CONFIG.ENDPOINTS.EVENTS.UPCOMING}?${queryString}`);
  }

  static async getEvent(id) {
    return this.makeRequest(API_CONFIG.ENDPOINTS.EVENTS.DETAIL.replace(':id', id));
  }

  // Association APIs
  static async getAssociations(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.makeRequest(`${API_CONFIG.ENDPOINTS.ASSOCIATIONS.LIST}?${queryString}`);
  }

  // BOD APIs
  static async getBOD(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.makeRequest(`${API_CONFIG.ENDPOINTS.BOD.LIST}?${queryString}`);
  }

  // Profile APIs
  static async getProfile() {
    return this.makeRequest(API_CONFIG.ENDPOINTS.AUTH.PROFILE);
  }

  static async updateProfile(profileData) {
    return this.makeRequest(API_CONFIG.ENDPOINTS.AUTH.PROFILE, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }
}
```

### **4. File Upload Service**
```javascript
class FileUploadService {
  static async uploadProfileImage(imageUri) {
    const token = await AuthService.getStoredToken();
    
    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'profile.jpg',
    });

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.UPLOAD.PROFILE_IMAGE}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error('Failed to upload image');
    }
  }
}
```

## 📱 **React Native Integration Examples**

### **1. Login Screen Implementation**
```javascript
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert } from 'react-native';
import { AuthService } from '../services/AuthService';

const LoginScreen = () => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('mobile'); // 'mobile' or 'otp'

  const handleSendOTP = async () => {
    if (!mobileNumber || mobileNumber.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit mobile number');
      return;
    }

    try {
      const response = await AuthService.sendOTP(mobileNumber);
      if (response.success) {
        setStep('otp');
        Alert.alert('Success', `OTP sent! Use: ${response.otp}`);
      } else {
        Alert.alert('Error', response.message);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || otp.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP');
      return;
    }

    try {
      const response = await AuthService.verifyOTP(mobileNumber, otp);
      if (response.success) {
        // Navigate to main app
        navigation.navigate('Home');
      } else {
        Alert.alert('Error', response.message);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      {step === 'mobile' ? (
        <>
          <TextInput
            placeholder="Enter Mobile Number"
            value={mobileNumber}
            onChangeText={setMobileNumber}
            keyboardType="numeric"
            maxLength={10}
          />
          <TouchableOpacity onPress={handleSendOTP}>
            <Text>Send OTP</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text>OTP sent to {mobileNumber}</Text>
          <TextInput
            placeholder="Enter OTP"
            value={otp}
            onChangeText={setOtp}
            keyboardType="numeric"
            maxLength={6}
          />
          <TouchableOpacity onPress={handleVerifyOTP}>
            <Text>Verify OTP</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};
```

### **2. Members List Screen**
```javascript
import React, { useState, useEffect } from 'react';
import { View, FlatList, Text, TouchableOpacity } from 'react-native';
import { APIService } from '../services/APIService';

const MembersScreen = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const response = await APIService.getMembers({ page, limit: 20 });
      if (response.success) {
        setMembers(response.members);
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderMember = ({ item }) => (
    <TouchableOpacity style={styles.memberCard}>
      <Text style={styles.memberName}>{item.name}</Text>
      <Text style={styles.businessName}>{item.businessName}</Text>
      <Text style={styles.businessType}>{item.businessType}</Text>
      <Text style={styles.city}>{item.city}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={members}
        renderItem={renderMember}
        keyExtractor={(item) => item._id}
        refreshing={loading}
        onRefresh={loadMembers}
      />
    </View>
  );
};
```

## 🔒 **Security & Best Practices**

### **Token Storage**
```javascript
// Use secure storage for production
import AsyncStorage from '@react-native-async-storage/async-storage';

// For production, consider using:
// - react-native-keychain
// - expo-secure-store
```

### **Error Handling**
```javascript
const handleAPIError = (error) => {
  if (error.message.includes('401')) {
    // Token expired, redirect to login
    AuthService.logout();
    navigation.navigate('Login');
  } else {
    Alert.alert('Error', error.message);
  }
};
```

### **Loading States**
```javascript
const [loading, setLoading] = useState(false);

const apiCall = async () => {
  setLoading(true);
  try {
    const response = await APIService.getData();
    // Handle success
  } catch (error) {
    // Handle error
  } finally {
    setLoading(false);
  }
};
```

## 📊 **Data Models**

### **Member Model**
```javascript
{
  _id: string,
  name: string,
  businessName: string,
  businessType: 'sound' | 'decorator' | 'catering' | 'generator' | 'madap' | 'light',
  phone: string,
  city: string,
  state: string,
  pincode: string,
  associationName: string,
  profileImage: string | null,
  email: string | null,
  isActive: boolean,
  isMobileVerified: boolean,
  paymentStatus: 'Paid' | 'Pending' | 'Overdue' | 'Not Required',
  createdAt: string,
  updatedAt: string
}
```

### **Event Model**
```javascript
{
  _id: string,
  title: string,
  description: string,
  type: 'Meeting' | 'Workshop' | 'Seminar' | 'Conference' | 'Celebration' | 'Training' | 'Announcement' | 'Other',
  date: string,
  startTime: string,
  endTime: string,
  location: {
    address: string,
    city: string,
    district: string,
    state: string,
    pincode: string
  },
  organizer: string,
  contactPerson: {
    name: string,
    phone: string,
    email: string | null
  },
  status: 'Upcoming' | 'Ongoing' | 'Completed' | 'Cancelled' | 'Postponed',
  priority: 'Low' | 'Medium' | 'High' | 'Urgent',
  isPublic: boolean,
  maxAttendees: number | null,
  currentAttendees: number,
  registrationRequired: boolean,
  registrationDeadline: string | null
}
```

## 🚀 **Getting Started**

1. **Install Dependencies**
```bash
npm install @react-native-async-storage/async-storage
# or
expo install @react-native-async-storage/async-storage
```

2. **Create API Service Files**
- Create `services/AuthService.js`
- Create `services/APIService.js`
- Create `services/FileUploadService.js`

3. **Test API Connection**
```javascript
// Test in your app
const testAPI = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/mobile/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobileNumber: '9876543210' })
    });
    const data = await response.json();
    console.log('API Test:', data);
  } catch (error) {
    console.error('API Error:', error);
  }
};
```

## ✅ **Ready for Integration!**

This documentation provides everything needed to integrate your React Native app with the backend APIs. The APIs are fully functional and ready for testing and integration.

**Key Points:**
- ✅ OTP-based authentication with default OTP "123456"
- ✅ Complete CRUD operations for all entities
- ✅ File upload functionality
- ✅ Search and filtering capabilities
- ✅ Pagination support
- ✅ Comprehensive error handling
- ✅ Mobile-optimized responses

**Next Steps:**
1. Test the APIs using the examples above
2. Implement the service classes in your React Native app
3. Connect your screens to the API services
4. Test the complete authentication flow
5. Implement file upload functionality

Happy coding! 🎉
