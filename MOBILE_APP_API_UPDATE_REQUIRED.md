# 📱 Mobile App API Update Required

## ⚠️ Important: QR Check-in API Response Format Changed

The QR check-in API response now includes **member name and profile image URL**. You need to update your mobile app to handle this new response format.

---

## 🔄 API Changes

### QR Check-in Endpoint: `POST /api/events/checkin`

#### ✅ New Response Format (Updated)

**Success Response:**
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

**Already Checked-in Response:**
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

#### ❌ Old Response Format (Deprecated)

```json
{
  "success": true,
  "message": "Check-in successful",
  "attendedAt": "2025-11-17T10:30:00.000Z"
}
```

---

## 📝 Required Mobile App Updates

### 1. Update Response Type/Interface

**TypeScript/TypeScript React Native:**
```typescript
interface CheckInResponse {
  success: boolean;
  message: string;
  attendedAt: string;
  member: {
    name: string | null;
    profileImageURL: string | null;
  };
}
```

**JavaScript:**
```javascript
// Response now includes member object
const response = {
  success: true,
  message: "Check-in successful",
  attendedAt: "2025-11-17T10:30:00.000Z",
  member: {
    name: "John Doe",           // NEW
    profileImageURL: "https://..." // NEW
  }
};
```

### 2. Update QR Check-in Handler

**Before:**
```javascript
const result = await checkInWithQR(qrToken);
if (result.success) {
  Alert.alert('Success', result.message);
}
```

**After:**
```javascript
const result = await checkInWithQR(qrToken);
if (result.success) {
  const memberName = result.member?.name || 'Attendee';
  const profileImage = result.member?.profileImageURL;
  
  // Display member info
  Alert.alert(
    'Check-in Successful',
    `${memberName} has been checked in.`,
    [{ text: 'OK' }]
  );
  
  // You can now display the profile image
  if (profileImage) {
    // Show image in your UI
  }
}
```

### 3. Update API Response Parsing

**Example Update:**
```javascript
export const checkInWithQR = async (qrToken) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/events/checkin`,
      { qrToken },
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (response.data.success) {
      return {
        success: true,
        message: response.data.message,
        attendedAt: response.data.attendedAt,
        member: {
          name: response.data.member?.name || null,        // NEW
          profileImageURL: response.data.member?.profileImageURL || null // NEW
        }
      };
    }
    // ... error handling
  } catch (error) {
    // ... error handling
  }
};
```

### 4. Display Member Information (Optional but Recommended)

**React Native Example:**
```jsx
const CheckInSuccessScreen = ({ checkInResult }) => {
  const { member, attendedAt } = checkInResult;
  
  return (
    <View>
      {member.profileImageURL && (
        <Image 
          source={{ uri: member.profileImageURL }} 
          style={{ width: 100, height: 100, borderRadius: 50 }}
        />
      )}
      <Text>{member.name || 'Attendee'}</Text>
      <Text>Checked in at: {new Date(attendedAt).toLocaleString()}</Text>
    </View>
  );
};
```

**Flutter Example:**
```dart
Widget buildCheckInSuccess(CheckInResponse result) {
  return Column(
    children: [
      if (result.member.profileImageURL != null)
        Image.network(
          result.member.profileImageURL!,
          width: 100,
          height: 100,
        ),
      Text(result.member.name ?? 'Attendee'),
      Text('Checked in at: ${formatDateTime(result.attendedAt)}'),
    ],
  );
}
```

---

## 🔍 What Changed

1. **Response Structure**: Added `member` object to success responses
2. **Member Data**: Includes `name` and `profileImageURL` fields
3. **Null Handling**: Both fields can be `null` if not available

---

## ⚠️ Breaking Changes

- **Old code will still work** - The API is backward compatible
- **New fields are optional** - `member.name` and `member.profileImageURL` can be `null`
- **No breaking changes** - Existing code will continue to work, but won't display member info

---

## ✅ Migration Checklist

- [ ] Update response type/interface to include `member` object
- [ ] Update QR check-in handler to extract member data
- [ ] Update success screen to display member name and image
- [ ] Handle null values for name and profileImageURL
- [ ] Test with QR codes that have/don't have profile images
- [ ] Update error handling if needed

---

## 📚 Reference

See `QR_CHECKIN_API_REFERENCE.md` for complete API documentation with examples.

---

**Last Updated:** November 17, 2025






