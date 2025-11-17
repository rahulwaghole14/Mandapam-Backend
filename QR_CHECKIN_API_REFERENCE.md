# 📱 QR Check-in API - Mobile App Reference

## Base URL
```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

---

## 🔍 API Endpoint

### Check-in Attendee by QR Code

**Endpoint:** `POST /api/events/checkin`  
**Access:** Public (No authentication required)  
**Content-Type:** `application/json`

---

## 📥 Request

### Headers
```http
Content-Type: application/json
```

### Request Body
```json
{
  "qrToken": "EVT:eyJkYXRhIjp7InIiOjEyMywiZSI6NDUsIm0iOjc4OSwidCI6MTY5ODc2NTQzMjEyM30sInNpZyI6IjEyMzQ1Njc4OTBhYmNkZWYifQ"
}
```

### Request Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `qrToken` | string | Yes | QR code token string (must start with `EVT:`) |

---

## 📤 Response

### ✅ Success Response (200 OK)

#### First Time Check-in
```json
{
  "success": true,
  "message": "Check-in successful",
  "attendedAt": "2025-11-17T10:30:00.000Z",
  "member": {
    "name": "John Doe",
    "profileImageURL": "https://cloudinary.com/image.jpg"
  }
}
```

#### Already Checked-in (Idempotent)
```json
{
  "success": true,
  "message": "Already checked-in",
  "attendedAt": "2025-11-17T10:25:00.000Z",
  "member": {
    "name": "John Doe",
    "profileImageURL": "https://cloudinary.com/image.jpg"
  }
}
```

**Response Fields:**
- `success` (boolean): Always `true` for success
- `message` (string): Success message
- `attendedAt` (string): ISO 8601 timestamp of check-in
- `member.name` (string|null): Member's full name
- `member.profileImageURL` (string|null): Full URL to member's profile image (Cloudinary or local)

---

### ❌ Error Responses

#### 400 Bad Request - Invalid QR Token
```json
{
  "success": false,
  "message": "Invalid QR token"
}
```

#### 400 Bad Request - Missing Token
```json
{
  "success": false,
  "errors": [
    {
      "msg": "qrToken is required",
      "param": "qrToken",
      "location": "body"
    }
  ]
}
```

#### 404 Not Found - Registration Not Found
```json
{
  "success": false,
  "message": "Registration not found"
}
```

#### 500 Internal Server Error
```json
{
  "success": false,
  "message": "Server error during check-in"
}
```

---

## 📱 Mobile App Integration Examples

### React Native / Expo

```javascript
import axios from 'axios';

const BASE_URL = 'https://your-domain.com/api';

/**
 * Verify and check-in attendee using QR code token
 * @param {string} qrToken - QR code token (starts with EVT:)
 * @returns {Promise<Object>} Check-in result with member info
 */
export const checkInWithQR = async (qrToken) => {
  try {
    // Validate QR token format
    if (!qrToken || !qrToken.startsWith('EVT:')) {
      return {
        success: false,
        message: 'Invalid QR code format'
      };
    }

    const response = await axios.post(
      `${BASE_URL}/events/checkin`,
      {
        qrToken: qrToken
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 second timeout
      }
    );

    if (response.data.success) {
      return {
        success: true,
        message: response.data.message,
        attendedAt: response.data.attendedAt,
        member: {
          name: response.data.member?.name || 'Unknown',
          profileImageURL: response.data.member?.profileImageURL || null
        }
      };
    }

    return {
      success: false,
      message: response.data.message || 'Check-in failed'
    };

  } catch (error) {
    if (error.response) {
      // Server responded with error status
      return {
        success: false,
        message: error.response.data?.message || 'Check-in failed',
        status: error.response.status
      };
    } else if (error.request) {
      // Request made but no response
      return {
        success: false,
        message: 'Network error. Please check your connection.'
      };
    } else {
      // Error setting up request
      return {
        success: false,
        message: error.message || 'An error occurred'
      };
    }
  }
};

// Usage with QR Scanner
import { BarCodeScanner } from 'expo-barcode-scanner';
import { Alert } from 'react-native';

const handleQRScan = async (data) => {
  // Validate QR code format
  if (!data.startsWith('EVT:')) {
    Alert.alert(
      'Invalid QR Code',
      'This is not a valid event registration QR code.',
      [{ text: 'OK' }]
    );
    return;
  }

  // Show loading indicator
  const result = await checkInWithQR(data);
  
  if (result.success) {
    Alert.alert(
      'Check-in Successful',
      `${result.member.name} has been checked in.`,
      [{ text: 'OK' }]
    );
    // You can now display member.name and member.profileImageURL in your UI
  } else {
    Alert.alert(
      'Check-in Failed',
      result.message,
      [{ text: 'OK' }]
    );
  }
};
```

---

### Flutter / Dart

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class QRCheckInService {
  static const String baseUrl = 'https://your-domain.com/api';

  /// Verify and check-in attendee using QR code token
  /// Returns check-in result with member info
  static Future<Map<String, dynamic>> checkInWithQR(String qrToken) async {
    try {
      // Validate QR token format
      if (!qrToken.startsWith('EVT:')) {
        return {
          'success': false,
          'message': 'Invalid QR code format'
        };
      }

      final response = await http.post(
        Uri.parse('$baseUrl/events/checkin'),
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonEncode({
          'qrToken': qrToken,
        }),
      ).timeout(Duration(seconds: 10));

      final data = jsonDecode(response.body);

      if (response.statusCode == 200 && data['success'] == true) {
        return {
          'success': true,
          'message': data['message'],
          'attendedAt': data['attendedAt'],
          'member': {
            'name': data['member']?['name'] ?? 'Unknown',
            'profileImageURL': data['member']?['profileImageURL'],
          }
        };
      } else {
        return {
          'success': false,
          'message': data['message'] ?? 'Check-in failed',
          'status': response.statusCode
        };
      }
    } catch (e) {
      if (e is TimeoutException) {
        return {
          'success': false,
          'message': 'Request timeout. Please try again.'
        };
      } else if (e is SocketException || e is HttpException) {
        return {
          'success': false,
          'message': 'Network error. Please check your connection.'
        };
      } else {
        return {
          'success': false,
          'message': 'An error occurred: ${e.toString()}'
        };
      }
    }
  }
}

// Usage with QR Scanner
import 'package:qr_code_scanner/qr_code_scanner.dart';
import 'package:flutter/material.dart';

void onQRViewCreated(QRViewController controller) {
  controller.scannedDataStream.listen((scanData) {
    if (scanData.code != null) {
      String qrCode = scanData.code!;
      
      // Validate QR code format
      if (!qrCode.startsWith('EVT:')) {
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: Text('Invalid QR Code'),
            content: Text('This is not a valid event registration QR code.'),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: Text('OK'),
              ),
            ],
          ),
        );
        return;
      }

      // Verify QR code
      QRCheckInService.checkInWithQR(qrCode).then((result) {
        if (result['success'] == true) {
          String memberName = result['member']?['name'] ?? 'Unknown';
          String? profileImageURL = result['member']?['profileImageURL'];
          
          showDialog(
            context: context,
            builder: (context) => AlertDialog(
              title: Text('Check-in Successful'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (profileImageURL != null)
                    Image.network(profileImageURL, height: 100),
                  SizedBox(height: 10),
                  Text('$memberName has been checked in.'),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text('OK'),
                ),
              ],
            ),
          );
        } else {
          showDialog(
            context: context,
            builder: (context) => AlertDialog(
              title: Text('Check-in Failed'),
              content: Text(result['message'] ?? 'Unknown error'),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: Text('OK'),
                ),
              ],
            ),
          );
        }
      });
    }
  });
}
```

---

## 🔄 Complete Integration Flow

### Step-by-Step Implementation

1. **Scan QR Code**
   - Use QR scanner library (expo-barcode-scanner, qr_code_scanner, etc.)
   - Extract scanned data string

2. **Validate Format**
   - Check if scanned data starts with `EVT:`
   - If not, show "Invalid QR code" message

3. **Call API**
   - Send POST request to `/api/events/checkin`
   - Include `qrToken` in request body

4. **Handle Response**
   - **Success**: Display member name and profile image
   - **Error**: Show appropriate error message

5. **Display Result**
   - Show success/error message
   - Display member information (name, photo)
   - Update UI accordingly

---

## 📋 Response Data Structure

### Success Response Object
```typescript
interface CheckInResponse {
  success: boolean;
  message: string;
  attendedAt: string; // ISO 8601 timestamp
  member: {
    name: string | null;
    profileImageURL: string | null;
  };
}
```

### Error Response Object
```typescript
interface ErrorResponse {
  success: boolean;
  message: string;
  errors?: Array<{
    msg: string;
    param: string;
    location: string;
  }>;
}
```

---

## ⚠️ Important Notes

1. **QR Token Format**: Always validate that token starts with `EVT:`
2. **Profile Image**: Can be `null` if member has no profile image
3. **Member Name**: Can be `null` if name is not available (shouldn't happen in normal cases)
4. **Idempotent**: Safe to call multiple times - won't cause duplicate check-ins
5. **No Authentication**: Endpoint is public, QR token signature provides security
6. **Network Timeout**: Set appropriate timeout (10 seconds recommended)
7. **Error Handling**: Always handle network errors and show user-friendly messages

---

## 🧪 Testing

### Test with cURL
```bash
curl -X POST https://your-domain.com/api/events/checkin \
  -H "Content-Type: application/json" \
  -d '{
    "qrToken": "EVT:eyJkYXRhIjp7InIiOjEyMywiZSI6NDUsIm0iOjc4OSwidCI6MTY5ODc2NTQzMjEyM30sInNpZyI6IjEyMzQ1Njc4OTBhYmNkZWYifQ"
  }'
```

### Expected Response
```json
{
  "success": true,
  "message": "Check-in successful",
  "attendedAt": "2025-11-17T10:30:00.000Z",
  "member": {
    "name": "John Doe",
    "profileImageURL": "https://cloudinary.com/image.jpg"
  }
}
```

---

## 📱 UI Display Example

After successful check-in, you can display:

```javascript
// React Native Example
<View>
  {result.member.profileImageURL && (
    <Image 
      source={{ uri: result.member.profileImageURL }} 
      style={{ width: 100, height: 100, borderRadius: 50 }}
    />
  )}
  <Text>{result.member.name}</Text>
  <Text>Checked in at: {new Date(result.attendedAt).toLocaleString()}</Text>
</View>
```

---

**Last Updated:** November 17, 2025

