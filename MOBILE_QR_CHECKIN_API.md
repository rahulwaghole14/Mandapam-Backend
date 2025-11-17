# 📱 Mobile QR Check-in API Documentation

## Base URL
```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

---

## 🔍 QR Check-in API

### Check-in Attendee by QR Code

Verify and mark attendance using a scanned QR code token.

**Endpoint:** `POST /api/events/checkin`  
**Access:** Public (No authentication required)  
**Content-Type:** `application/json`

---

## 📥 Request

### Headers
```http
Content-Type: application/json
```

**Note:** No authorization header is required. The endpoint is publicly accessible. The QR token itself provides security through HMAC-SHA256 signature verification.

### Request Body
```json
{
  "qrToken": "EVT:eyJkYXRhIjp7InIiOjEyMywiZSI6NDUsIm0iOjc4OSwidCI6MTY5ODc2NTQzMjEyM30sInNpZyI6IjEyMzQ1Njc4OTBhYmNkZWYifQ"
}
```

### Field Description
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `qrToken` | string | Yes | The QR code token string (must start with `EVT:`) |

---

## 📤 Response

### Success - Check-in Successful (200)

**First Time Check-in:**
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

**Already Checked-in (Idempotent):**
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

**Note:** If member has no profile image, `profileImageURL` will be `null`. If member name is not available, `name` will be `null`.

---

### Error Responses

#### 400 Bad Request - Invalid QR Token
```json
{
  "success": false,
  "message": "Invalid QR token"
}
```

#### 400 Bad Request - Validation Error
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

## 🔐 QR Code Format

QR codes are generated when a member registers for an event. They contain:

- **Registration ID** (`r`)
- **Event ID** (`e`)
- **Member ID** (`m`)
- **Timestamp** (`t`)
- **HMAC Signature** (`sig`) for security

**QR Code Format:**
```
EVT:<base64url_encoded_json>
```

**Example QR Code Content:**
```
EVT:eyJkYXRhIjp7InIiOjEyMywiZSI6NDUsIm0iOjc4OSwidCI6MTY5ODc2NTQzMjEyM30sInNpZyI6IjEyMzQ1Njc4OTBhYmNkZWYifQ
```

---

## 📱 Mobile App Integration

### React Native / Expo Example

```javascript
import axios from 'axios';
import { Alert } from 'react-native';

const verifyQRCode = async (qrToken) => {
  try {
    const response = await axios.post(
      'https://your-domain.com/api/events/checkin',
      {
        qrToken: qrToken
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.success) {
      const message = response.data.message === 'Already checked-in'
        ? 'This attendee was already checked in.'
        : 'Check-in successful!';
      
      return {
        success: true,
        message: message,
        attendedAt: response.data.attendedAt
      };
    }
  } catch (error) {
    if (error.response) {
      // Server responded with error
      return {
        success: false,
        message: error.response.data.message || 'Check-in failed'
      };
    } else {
      // Network error
      return {
        success: false,
        message: 'Network error. Please check your connection.'
      };
    }
  }
};

// Usage with QR scanner
import { BarCodeScanner } from 'expo-barcode-scanner';

const handleQRScan = async (data) => {
  // Validate QR code format
  if (!data.startsWith('EVT:')) {
    Alert.alert('Invalid QR Code', 'This is not a valid event registration QR code.', [{ text: 'OK' }]);
    return;
  }

  // Show loading indicator
  const result = await verifyQRCode(data);
  
  if (result.success) {
    Alert.alert(
      'Success',
      result.message,
      [{ text: 'OK' }]
    );
  } else {
    Alert.alert('Error', result.message, [{ text: 'OK' }]);
  }
};
```

---

### Flutter / Dart Example

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:flutter/material.dart';

Future<Map<String, dynamic>> verifyQRCode(String qrToken) async {
  try {
    final response = await http.post(
      Uri.parse('https://your-domain.com/api/events/checkin'),
      headers: {
        'Content-Type': 'application/json',
      },
      body: jsonEncode({
        'qrToken': qrToken,
      }),
    );

    final data = jsonDecode(response.body);

    if (response.statusCode == 200 && data['success'] == true) {
      return {
        'success': true,
        'message': data['message'],
        'attendedAt': data['attendedAt'],
      };
    } else {
      return {
        'success': false,
        'message': data['message'] ?? 'Check-in failed',
      };
    }
  } catch (e) {
    return {
      'success': false,
      'message': 'Network error: ${e.toString()}',
    };
  }
}

// Usage with QR scanner
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
      verifyQRCode(qrCode).then((result) {
        if (result['success'] == true) {
          showDialog(
            context: context,
            builder: (context) => AlertDialog(
              title: Text('Success'),
              content: Text(result['message']),
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
              title: Text('Error'),
              content: Text(result['message']),
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

## 🔄 Integration Flow

### Complete Check-in Workflow

1. **Event staff opens QR scanner** in the mobile app
2. **Staff scans QR code** displayed by attendee
3. **App extracts QR token** (should start with `EVT:`)
4. **App validates format** - Check if token starts with `EVT:`
5. **App calls verification API** with the token (no authentication needed)
6. **API validates token**:
   - Verifies HMAC signature
   - Checks if registration exists
   - Validates registration, event, and member IDs
7. **API marks attendance**:
   - Updates registration status to `'attended'`
   - Sets `attendedAt` timestamp
   - Returns success response (idempotent - safe to call multiple times)
8. **App displays result** to event staff

### Error Handling Flow

```
QR Code Scanned
    ↓
Is format valid? (starts with EVT:)
    ↓ NO → Show "Invalid QR format"
    ↓ YES
Call API
    ↓
Check response status
    ↓
200 → Show success message
    ↓
400 → Show "Invalid QR token" or validation error
    ↓
404 → Show "Registration not found"
    ↓
500 → Show "Server error" → Retry option
```

---

## 🔒 Security Features

1. **HMAC-SHA256 Signature**: QR tokens are signed with a secret key (`QR_SECRET`) to prevent tampering
2. **Token Verification**: Server verifies signature before processing
3. **Registration Validation**: Checks that registration exists and matches event/member
4. **Public Access with Security**: No authentication required - QR token signature provides security
5. **Idempotent Operations**: Safe to call multiple times without side effects (already checked-in returns success)

---

## 📝 Important Notes

### QR Code Scanning
- QR codes are generated as base64 data URLs (PNG images) for display
- The actual QR content is a string starting with `EVT:`
- When scanning, extract the string content (not the image data)
- QR codes are generated on-the-fly, not stored in the database

### Token Format
- Always validate that scanned QR code starts with `EVT:`
- Token is base64url encoded JSON containing registration data and signature
- Token format: `EVT:<base64url_encoded_json>`

### Check-in Behavior
- First check-in: Updates status to `'attended'` and sets `attendedAt` timestamp
- Subsequent check-ins: Returns success with existing `attendedAt` timestamp (idempotent)
- Registration must exist and match the event/member IDs in the token

### Error Handling
- Network errors: Show retry option
- Invalid token: Show "Invalid QR code" message
- Registration not found: Show "Registration not found" message
- Server errors: Show generic error with retry option

---

## 🧪 Testing

### Test QR Token Format
```
EVT:eyJkYXRhIjp7InIiOjEyMywiZSI6NDUsIm0iOjc4OSwidCI6MTY5ODc2NTQzMjEyM30sInNpZyI6IjEyMzQ1Njc4OTBhYmNkZWYifQ
```

### cURL Example
```bash
curl -X POST https://your-domain.com/api/events/checkin \
  -H "Content-Type: application/json" \
  -d '{
    "qrToken": "EVT:eyJkYXRhIjp7InIiOjEyMywiZSI6NDUsIm0iOjc4OSwidCI6MTY5ODc2NTQzMjEyM30sInNpZyI6IjEyMzQ1Njc4OTBhYmNkZWYifQ"
  }'
```

---

**Last Updated:** November 17, 2025

