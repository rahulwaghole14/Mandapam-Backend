# QR Code Verification API Documentation

## 📋 **Overview**

This document describes the QR code verification API for event registration check-in. The API allows event organizers/admins to scan QR codes generated during event registration and verify/mark attendance.

---

## 🔐 **Authentication**

**No authentication required** - The QR verification endpoint is publicly accessible.

The QR token itself provides security through HMAC-SHA256 signature verification, so no additional authentication token is needed. This allows event staff to quickly scan QR codes without needing to log in.

---

## 📱 **QR Code Format**

QR codes are generated **on-the-fly** when a member registers for an event. They contain:

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

## 🔍 **API Endpoint**

### **Check-in Attendee by QR Code**

Verify and mark attendance using a scanned QR code token.

- **Method:** `POST`
- **Path:** `/api/events/checkin`
- **Access:** Public (No authentication required)
- **Base URL:** `http://localhost:5000` (Development) / `https://your-domain.com` (Production)

---

## 📥 **Request**

### **Headers**
```http
Content-Type: application/json
```

**Note:** No authorization header is required. The endpoint is publicly accessible.

### **Request Body**
```json
{
  "qrToken": "EVT:eyJkYXRhIjp7InIiOjEyMywiZSI6NDUsIm0iOjc4OSwidCI6MTY5ODc2NTQzMjEyM30sInNpZyI6IjEyMzQ1Njc4OTBhYmNkZWYifQ"
}
```

### **Field Description**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `qrToken` | string | Yes | The QR code token string (starts with `EVT:`) |

---

## 📤 **Response**

### **Success - Check-in Successful (200)**

```json
{
  "success": true,
  "message": "Check-in successful",
  "attendedAt": "2025-01-15T10:30:00.000Z"
}
```

### **Success - Already Checked-in (200)**

If the attendee has already been checked in:

```json
{
  "success": true,
  "message": "Already checked-in",
  "attendedAt": "2025-01-15T10:25:00.000Z"
}
```

**Note:** This endpoint is **idempotent** - calling it multiple times with the same QR code will return the same result without errors.

---

## ❌ **Error Responses**

### **400 Bad Request - Invalid QR Token**

```json
{
  "success": false,
  "message": "Invalid QR token"
}
```

**Possible causes:**
- QR token signature is invalid
- QR token format is incorrect
- QR token has been tampered with
- QR token is expired or corrupted

### **400 Bad Request - Validation Error**

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

### **401 Unauthorized**

This error should not occur as the endpoint is publicly accessible. If you see this error, it may indicate a server configuration issue.

### **404 Not Found - Registration Not Found**

```json
{
  "success": false,
  "message": "Registration not found"
}
```

**Possible causes:**
- Registration ID doesn't exist
- Event ID doesn't match
- Member ID doesn't match
- Registration was deleted

### **500 Internal Server Error**

```json
{
  "success": false,
  "message": "Server error during check-in"
}
```

---

## 💻 **Code Examples**

### **React Native / Expo Example**

```javascript
import axios from 'axios';

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
      console.log('Check-in successful:', response.data.message);
      console.log('Attended at:', response.data.attendedAt);
      return {
        success: true,
        message: response.data.message,
        attendedAt: response.data.attendedAt
      };
    }
  } catch (error) {
    if (error.response) {
      // Server responded with error
      console.error('Error:', error.response.data.message);
      return {
        success: false,
        message: error.response.data.message || 'Check-in failed'
      };
    } else {
      // Network error
      console.error('Network error:', error.message);
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
  if (data.startsWith('EVT:')) {
    const result = await verifyQRCode(data);
    
    if (result.success) {
      Alert.alert(
        'Success',
        result.message === 'Already checked-in' 
          ? 'This attendee was already checked in.'
          : 'Check-in successful!',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Error', result.message, [{ text: 'OK' }]);
    }
  } else {
    Alert.alert('Invalid QR Code', 'This is not a valid event registration QR code.', [{ text: 'OK' }]);
  }
};
```

### **Flutter / Dart Example**

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

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
import 'package:qr_code_scanner/qr_code_scanner.dart';

void onQRViewCreated(QRViewController controller) {
  controller.scannedDataStream.listen((scanData) {
    if (scanData.code != null && scanData.code!.startsWith('EVT:')) {
      verifyQRCode(scanData.code!).then((result) {
        if (result['success'] == true) {
          // Show success message
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
          // Show error message
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

### **cURL Example**

```bash
curl -X POST https://your-domain.com/api/events/checkin \
  -H "Content-Type: application/json" \
  -d '{
    "qrToken": "EVT:eyJkYXRhIjp7InIiOjEyMywiZSI6NDUsIm0iOjc4OSwidCI6MTY5ODc2NTQzMjEyM30sInNpZyI6IjEyMzQ1Njc4OTBhYmNkZWYifQ"
  }'
```

### **JavaScript / Node.js Example**

```javascript
const axios = require('axios');

async function verifyQRCode(qrToken) {
  try {
    const response = await axios.post(
      'https://your-domain.com/api/events/checkin',
      { qrToken },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  } catch (error) {
    if (error.response) {
      throw new Error(error.response.data.message || 'Check-in failed');
    } else {
      throw new Error('Network error');
    }
  }
}

// Usage
verifyQRCode('EVT:...')
  .then(result => {
    console.log('Success:', result.message);
  })
  .catch(error => {
    console.error('Error:', error.message);
  });
```

---

## 🔄 **Integration Flow**

### **Complete Check-in Workflow**

1. **Event staff opens QR scanner** in the mobile app
2. **Staff scans QR code** displayed by attendee
3. **App extracts QR token** (should start with `EVT:`)
4. **App calls verification API** with the token (no authentication needed)
5. **API validates token**:
   - Verifies HMAC signature
   - Checks if registration exists
   - Validates registration, event, and member IDs
6. **API marks attendance**:
   - Updates registration status to `'attended'`
   - Sets `attendedAt` timestamp
   - Returns success response (idempotent)
7. **App displays result** to event staff

### **Error Handling Flow**

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

## 🔒 **Security Features**

1. **HMAC-SHA256 Signature**: QR tokens are signed with a secret key to prevent tampering
2. **Token Verification**: Server verifies signature before processing
3. **Registration Validation**: Checks that registration exists and matches event/member
4. **Public Access with Security**: No authentication required - QR token signature provides security
5. **Idempotent Operations**: Safe to call multiple times without side effects

---

## 📝 **Notes for Mobile App Team**

### **QR Code Scanning**

- QR codes are generated as base64 data URLs (PNG images)
- The actual QR content is a string starting with `EVT:`
- When scanning, extract the string content (not the image data)
- QR codes are generated on-the-fly, not stored in the database

### **Token Format**

- Always validate that scanned QR code starts with `EVT:`
- The token after `EVT:` is base64url-encoded JSON
- Don't try to decode it client-side - send it to the server for verification

### **Error Messages**

- Provide clear, user-friendly error messages
- For "Invalid QR token", suggest:
  - "This QR code may be corrupted or expired"
  - "Please ask the attendee to show their QR code again"
- For "Registration not found", suggest:
  - "This registration may have been cancelled"
  - "Please contact the event organizer"

### **Offline Handling**

- QR verification requires server connection
- Cache scanned QR codes if offline, verify when connection restored
- Show appropriate message when offline

### **Performance**

- API is fast (typically < 500ms)
- Consider showing loading indicator during verification
- Implement retry logic for network errors

---

## 🧪 **Testing**

### **Test Cases**

1. **Valid QR Code** → Should return success
2. **Already Checked-in** → Should return success with "Already checked-in" message
3. **Invalid Token Format** → Should return 400 error
4. **Tampered Token** → Should return 400 "Invalid QR token"
5. **Non-existent Registration** → Should return 404
6. **Missing Authentication** → Should return 401
7. **Network Error** → Should handle gracefully

### **Test QR Codes**

You can generate test QR codes by:
1. Registering a member for an event
2. Getting the QR code from registration response
3. Using that QR token for testing

---

## 📚 **Related APIs**

- **Get Event Details**: `GET /api/mobile/events/:id`
- **Get My Registrations**: `GET /api/mobile/my/events`
- **Get QR Code**: `GET /api/mobile/registrations/:id/qr`
- **Event Registration**: `POST /api/mobile/events/:id/rsvp` (free events)
- **Payment Confirmation**: `POST /api/mobile/events/:id/confirm-payment` (paid events)

---

## ❓ **FAQ**

**Q: Can the same QR code be scanned multiple times?**
A: Yes, the endpoint is idempotent. It will return success with "Already checked-in" message if scanned again.

**Q: How long are QR codes valid?**
A: QR codes don't expire by themselves, but they must match an existing registration in the database.

**Q: What happens if a registration is cancelled?**
A: The QR code will fail verification with "Registration not found" error.

**Q: Do I need to be logged in to scan QR codes?**
A: No, the QR verification endpoint is publicly accessible. No authentication is required. The QR token itself provides security through signature verification.

**Q: Do QR codes work offline?**
A: No, verification requires server connection to validate the token and registration.

**Q: Is it safe to make this endpoint public?**
A: Yes, the QR tokens are cryptographically signed with HMAC-SHA256, making them tamper-proof. Only valid, signed tokens can be verified, providing security without requiring authentication.

---

## 📞 **Support**

For issues or questions:
- Check API response error messages
- Ensure QR code format is correct (starts with `EVT:`)
- Verify network connection is working
- Contact backend team for server-related issues

---

**Last Updated:** January 2025  
**API Version:** 1.0

