# 🔄 Refresh Token API Documentation

## Overview

The Refresh Token system provides secure, long-lasting authentication for mobile app users with automatic token refresh capabilities. This system replaces the previous 24-hour JWT-only approach with a more secure and user-friendly solution.

## 🚀 Key Features

- **Short-lived Access Tokens**: 15-minute expiration for security
- **Long-lived Refresh Tokens**: 30-day expiration for convenience
- **Automatic Token Refresh**: Seamless user experience
- **Session Management**: Track and manage active sessions
- **Device Tracking**: Monitor login devices and locations
- **Secure Logout**: Server-side token revocation
- **Automatic Cleanup**: Daily cleanup of expired tokens

## 🔐 Authentication Flow

### **New Login Flow:**
1. **Send OTP** → User enters mobile number
2. **Verify OTP** → User enters OTP code
3. **Get Tokens** → Server returns access + refresh tokens
4. **Use Access Token** → For API calls (15 minutes)
5. **Auto Refresh** → Use refresh token to get new access token
6. **Seamless Experience** → No re-login needed for 30 days

### **Token Types:**

| Token Type | Duration | Purpose | Storage |
|------------|----------|---------|---------|
| **Access Token** | 15 minutes | API authentication | Memory/State |
| **Refresh Token** | 30 days | Token renewal | Secure storage |

## 📋 API Endpoints

### **1. Login (Verify OTP)**
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
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "2cdef780c851706524096d9d158fb0c67b3eff26897d29d535...",
  "expiresIn": 900,
  "refreshExpiresIn": 2592000,
  "member": {
    "id": 217,
    "name": "Tanaji Nagnath Bhutavale",
    "businessName": "Bhutavale Sound Systems",
    "businessType": "sound",
    "phone": "9876543210",
    "city": "Mumbai",
    "associationName": "Mumbai Mandap Association",
    "isActive": true
  }
}
```

### **2. Refresh Access Token**
```http
POST /api/mobile/refresh-token
Content-Type: application/json

{
  "refreshToken": "2cdef780c851706524096d9d158fb0c67b3eff26897d29d535..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900,
  "member": {
    "id": 217,
    "name": "Tanaji Nagnath Bhutavale",
    "businessName": "Bhutavale Sound Systems",
    "businessType": "sound",
    "phone": "9876543210",
    "city": "Mumbai",
    "associationName": "Mumbai Mandap Association",
    "isActive": true
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Invalid or expired refresh token"
}
```

### **3. Logout**
```http
POST /api/mobile/logout
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "refreshToken": "2cdef780c851706524096d9d158fb0c67b3eff26897d29d535..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Note:** If no `refreshToken` is provided, all sessions for the user will be revoked.

### **4. Get Active Sessions**
```http
GET /api/mobile/sessions
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "id": 1,
      "deviceInfo": {
        "platform": "ios",
        "appVersion": "1.0.0"
      },
      "ipAddress": "127.0.0.1",
      "lastUsedAt": "2025-09-19T08:13:22.619Z",
      "createdAt": "2025-09-19T08:12:36.237Z"
    },
    {
      "id": 2,
      "deviceInfo": {
        "platform": "android",
        "appVersion": "1.0.0"
      },
      "ipAddress": "192.168.1.100",
      "lastUsedAt": "2025-09-19T07:45:12.123Z",
      "createdAt": "2025-09-19T07:30:15.456Z"
    }
  ]
}
```

### **5. Revoke All Sessions**
```http
POST /api/mobile/revoke-all-sessions
Authorization: Bearer <access_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Revoked 2 active sessions",
  "revokedCount": 2
}
```

## 📱 Mobile App Integration

### **React Native Implementation:**

```javascript
// Token Management Service
class TokenService {
  static async storeTokens(accessToken, refreshToken) {
    await AsyncStorage.setItem('access_token', accessToken);
    await AsyncStorage.setItem('refresh_token', refreshToken);
  }

  static async getAccessToken() {
    return await AsyncStorage.getItem('access_token');
  }

  static async getRefreshToken() {
    return await AsyncStorage.getItem('refresh_token');
  }

  static async clearTokens() {
    await AsyncStorage.removeItem('access_token');
    await AsyncStorage.removeItem('refresh_token');
  }

  static async refreshAccessToken() {
    const refreshToken = await this.getRefreshToken();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_BASE_URL}/api/mobile/refresh-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();

    if (data.success) {
      await AsyncStorage.setItem('access_token', data.accessToken);
      return data.accessToken;
    } else {
      // Refresh token expired, redirect to login
      await this.clearTokens();
      throw new Error('Refresh token expired');
    }
  }
}

// API Service with Auto-Refresh
class APIService {
  static async makeRequest(url, options = {}) {
    let accessToken = await TokenService.getAccessToken();

    // Add authorization header
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    let response = await fetch(url, {
      ...options,
      headers,
    });

    // If token expired, try to refresh
    if (response.status === 401 && accessToken) {
      try {
        accessToken = await TokenService.refreshAccessToken();
        headers.Authorization = `Bearer ${accessToken}`;
        
        // Retry the request with new token
        response = await fetch(url, {
          ...options,
          headers,
        });
      } catch (error) {
        // Refresh failed, redirect to login
        throw new Error('Authentication failed');
      }
    }

    return response;
  }
}

// Usage Example
const getMembers = async () => {
  try {
    const response = await APIService.makeRequest(`${API_BASE_URL}/api/mobile/members`);
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    // Handle error (redirect to login, show error message, etc.)
  }
};
```

### **Login Component:**

```javascript
const LoginScreen = () => {
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('mobile'); // 'mobile' or 'otp'

  const sendOTP = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/mobile/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber }),
      });
      
      const data = await response.json();
      if (data.success) {
        setStep('otp');
      }
    } catch (error) {
      console.error('Send OTP Error:', error);
    }
  };

  const verifyOTP = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/mobile/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobileNumber, otp }),
      });
      
      const data = await response.json();
      if (data.success) {
        // Store tokens
        await TokenService.storeTokens(data.accessToken, data.refreshToken);
        
        // Navigate to main app
        navigation.navigate('Home');
      }
    } catch (error) {
      console.error('Verify OTP Error:', error);
    }
  };

  return (
    <View>
      {step === 'mobile' ? (
        <View>
          <TextInput
            value={mobileNumber}
            onChangeText={setMobileNumber}
            placeholder="Enter mobile number"
            keyboardType="phone-pad"
          />
          <Button title="Send OTP" onPress={sendOTP} />
        </View>
      ) : (
        <View>
          <TextInput
            value={otp}
            onChangeText={setOtp}
            placeholder="Enter OTP"
            keyboardType="number-pad"
          />
          <Button title="Verify OTP" onPress={verifyOTP} />
        </View>
      )}
    </View>
  );
};
```

## 🔒 Security Features

### **Token Security:**
- **Access Tokens**: Short-lived (15 minutes) to minimize exposure
- **Refresh Tokens**: Long-lived (30 days) but stored securely
- **Token Rotation**: New refresh token on each refresh (optional)
- **Device Tracking**: Monitor login devices and locations
- **IP Tracking**: Track login IP addresses
- **Revocation**: Immediate token revocation on logout

### **Session Management:**
- **Multiple Sessions**: Users can be logged in on multiple devices
- **Session Visibility**: Users can see all active sessions
- **Remote Logout**: Users can revoke sessions from other devices
- **Automatic Cleanup**: Expired tokens are automatically removed

### **Rate Limiting:**
- **OTP Requests**: 3 requests per 15 minutes
- **Token Refresh**: Reasonable limits to prevent abuse
- **Login Attempts**: Protection against brute force attacks

## 🛠️ Backend Implementation

### **Database Schema:**
```sql
CREATE TABLE refresh_tokens (
  id SERIAL PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  expires_at TIMESTAMP NOT NULL,
  is_revoked BOOLEAN NOT NULL DEFAULT FALSE,
  device_info JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### **Automatic Cleanup:**
- **Daily Cleanup**: Runs at 2:00 AM IST daily
- **Expired Tokens**: Automatically removes expired refresh tokens
- **Performance**: Maintains database performance

## 📊 Monitoring & Analytics

### **Session Analytics:**
- **Active Sessions**: Track number of active sessions per user
- **Device Distribution**: Monitor device types and versions
- **Geographic Data**: Track login locations (IP-based)
- **Usage Patterns**: Monitor token refresh frequency

### **Security Monitoring:**
- **Failed Refresh Attempts**: Monitor invalid refresh token usage
- **Suspicious Activity**: Detect unusual login patterns
- **Token Abuse**: Monitor for token sharing or misuse

## 🚀 Migration Guide

### **From Old System:**
1. **Update Mobile App**: Implement new token management
2. **Test Thoroughly**: Ensure seamless user experience
3. **Deploy Backend**: New refresh token system
4. **Monitor**: Watch for any issues during transition

### **Backward Compatibility:**
- **Old Tokens**: Will continue to work until expiration
- **Gradual Migration**: Users will migrate as they log in
- **No Breaking Changes**: Existing functionality preserved

## 🧪 Testing

### **Test Scenarios:**
1. **Login Flow**: Send OTP → Verify OTP → Get tokens
2. **Token Refresh**: Use refresh token to get new access token
3. **Token Expiration**: Handle expired access tokens
4. **Logout**: Revoke tokens and clear sessions
5. **Multiple Sessions**: Login from multiple devices
6. **Session Management**: View and revoke sessions

### **Error Handling:**
- **Invalid Refresh Token**: Redirect to login
- **Network Errors**: Retry with exponential backoff
- **Server Errors**: Graceful degradation
- **Token Expiry**: Automatic refresh or re-login

## 📈 Performance

### **Optimizations:**
- **Database Indexes**: Optimized queries for token operations
- **Caching**: Token validation caching (optional)
- **Cleanup Jobs**: Automated cleanup of expired tokens
- **Connection Pooling**: Efficient database connections

### **Scalability:**
- **Horizontal Scaling**: Stateless token validation
- **Load Balancing**: Multiple server instances supported
- **Database Optimization**: Efficient token storage and retrieval

---

## 📋 Quick Reference

### **Key Endpoints:**
- `POST /api/mobile/verify-otp` - Login and get tokens
- `POST /api/mobile/refresh-token` - Refresh access token
- `POST /api/mobile/logout` - Logout and revoke tokens
- `GET /api/mobile/sessions` - Get active sessions
- `POST /api/mobile/revoke-all-sessions` - Revoke all sessions

### **Token Lifetimes:**
- **Access Token**: 15 minutes
- **Refresh Token**: 30 days
- **OTP**: 10 minutes

### **Security Headers:**
- `Authorization: Bearer <access_token>`
- `X-Platform: ios/android`
- `X-App-Version: 1.0.0`

---

**Last Updated**: September 19, 2025  
**Version**: 1.0.0  
**Author**: Development Team
