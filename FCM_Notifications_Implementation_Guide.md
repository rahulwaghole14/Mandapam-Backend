# 📱 FCM Push Notifications - Implementation Guide

## 🎯 Overview
This document outlines the implementation of Firebase Cloud Messaging (FCM) push notifications for the Mandapam mobile app. The system will handle **Event Notifications** and **App Update Notifications** only.

## 🏗️ Architecture

### Backend Components
- **FCM Service** - Handles sending push notifications
- **Token Management** - Registers and manages device tokens
- **Event Integration** - Triggers notifications for event activities
- **App Update System** - Sends app update notifications

### Mobile App Components
- **FCM Integration** - React Native Firebase setup
- **Token Registration** - Register device tokens with backend
- **Notification Handling** - Process incoming notifications
- **Deep Linking** - Navigate to relevant screens

## 📊 Database Schema

### FCM Tokens Table
```sql
CREATE TABLE fcm_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  device_type ENUM('android', 'ios'),
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Notification Logs Table
```sql
CREATE TABLE notification_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type ENUM('event', 'app_update'),
  event_id INTEGER REFERENCES events(id), -- NULL for app updates
  sent_at TIMESTAMP DEFAULT NOW(),
  status ENUM('sent', 'failed')
);
```

## 🔌 API Endpoints

### Mobile APIs

#### 1. Register FCM Token
```
POST /api/mobile/notifications/register-token
```

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "token": "fcm_device_token_here",
  "deviceType": "android" // or "ios"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Token registered successfully"
}
```

#### 2. Get Notification Preferences
```
GET /api/mobile/notifications/preferences
```

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "preferences": {
    "eventNotifications": true,
    "appUpdateNotifications": true
  }
}
```

#### 3. Update Notification Preferences
```
PUT /api/mobile/notifications/preferences
```

**Headers:**
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "eventNotifications": true,
  "appUpdateNotifications": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Preferences updated successfully"
}
```

## 📱 Mobile App Integration

### 1. Dependencies Installation

```bash
npm install @react-native-firebase/app @react-native-firebase/messaging
```

### 2. Firebase Configuration

#### Android Setup
1. Add `google-services.json` to `android/app/`
2. Update `android/build.gradle`:
```gradle
buildscript {
  dependencies {
    classpath 'com.google.gms:google-services:4.3.15'
  }
}
```

3. Update `android/app/build.gradle`:
```gradle
apply plugin: 'com.google.gms.google-services'
```

#### iOS Setup
1. Add `GoogleService-Info.plist` to iOS project
2. Update `ios/Podfile`:
```ruby
pod 'Firebase/Messaging'
```

### 3. FCM Service Implementation

```javascript
// services/fcmService.js
import messaging from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import { api } from './api';

class FCMService {
  async requestPermission() {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (enabled) {
      console.log('Authorization status:', authStatus);
      return true;
    }
    return false;
  }

  async getToken() {
    try {
      const token = await messaging().getToken();
      return token;
    } catch (error) {
      console.error('Error getting FCM token:', error);
      return null;
    }
  }

  async registerToken(userId) {
    try {
      const token = await this.getToken();
      if (token) {
        await api.post('/api/mobile/notifications/register-token', {
          token,
          deviceType: Platform.OS
        });
        console.log('FCM token registered successfully');
      }
    } catch (error) {
      console.error('Error registering FCM token:', error);
    }
  }

  setupNotificationHandlers() {
    // Handle background messages
    messaging().setBackgroundMessageHandler(async remoteMessage => {
      console.log('Message handled in the background!', remoteMessage);
    });

    // Handle foreground messages
    messaging().onMessage(async remoteMessage => {
      console.log('A new FCM message arrived!', remoteMessage);
      // Show in-app notification
      this.showInAppNotification(remoteMessage);
    });

    // Handle notification tap
    messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('Notification caused app to open from background state:', remoteMessage);
      this.handleNotificationTap(remoteMessage);
    });

    // Handle notification tap when app is closed
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('Notification caused app to open from quit state:', remoteMessage);
          this.handleNotificationTap(remoteMessage);
        }
      });
  }

  showInAppNotification(remoteMessage) {
    // Implement in-app notification display
    // You can use react-native-toast-message or similar library
  }

  handleNotificationTap(remoteMessage) {
    const { data } = remoteMessage;
    
    if (data.type === 'event') {
      // Navigate to event details
      // navigation.navigate('EventDetails', { id: data.eventId });
    } else if (data.type === 'app_update') {
      // Show update dialog
      // showUpdateDialog(data.version);
    }
  }
}

export default new FCMService();
```

### 4. App Integration

```javascript
// App.js
import React, { useEffect } from 'react';
import FCMService from './services/fcmService';
import { useAuth } from './hooks/useAuth';

const App = () => {
  const { user } = useAuth();

  useEffect(() => {
    const initializeFCM = async () => {
      const hasPermission = await FCMService.requestPermission();
      if (hasPermission) {
        FCMService.setupNotificationHandlers();
      }
    };

    initializeFCM();
  }, []);

  useEffect(() => {
    if (user) {
      FCMService.registerToken(user.id);
    }
  }, [user]);

  // ... rest of your app
};
```

## 🔔 Notification Types & Examples

### Event Notifications

#### New Event Created
```json
{
  "title": "New Event: Annual Meeting",
  "body": "Annual association meeting on Dec 15th at 6 PM",
  "data": {
    "type": "event",
    "eventId": "123",
    "action": "view_event"
  }
}
```

#### Event Updated
```json
{
  "title": "Event Updated: Annual Meeting",
  "body": "Time changed to 7 PM. Check details for more info.",
  "data": {
    "type": "event",
    "eventId": "123",
    "action": "view_event"
  }
}
```

#### Event Reminder
```json
{
  "title": "Event Reminder: Annual Meeting",
  "body": "Your event starts in 24 hours. Don't forget!",
  "data": {
    "type": "event",
    "eventId": "123",
    "action": "view_event"
  }
}
```

### App Update Notifications

#### New Version Available
```json
{
  "title": "App Update Available",
  "body": "New version 2.1.0 with improved features is now available",
  "data": {
    "type": "app_update",
    "version": "2.1.0",
    "action": "update_app"
  }
}
```

#### Maintenance Notification
```json
{
  "title": "Scheduled Maintenance",
  "body": "App will be under maintenance from 2 AM to 4 AM today",
  "data": {
    "type": "app_update",
    "action": "maintenance"
  }
}
```

## 🎯 User Experience Flow

### 1. First App Launch
1. Request notification permissions
2. Get FCM token
3. Register token with backend
4. Set up notification handlers

### 2. User Login
1. Re-register FCM token (in case it changed)
2. Update notification preferences

### 3. Receiving Notifications
1. **Foreground**: Show in-app notification
2. **Background**: Show system notification
3. **App Closed**: Show system notification

### 4. Notification Tap
1. Parse notification data
2. Navigate to relevant screen
3. Handle deep linking

## 🔧 Testing

### 1. Test Token Registration
```javascript
// Test FCM token registration
const testTokenRegistration = async () => {
  try {
    const response = await api.post('/api/mobile/notifications/register-token', {
      token: 'test_token_123',
      deviceType: 'android'
    });
    console.log('Token registration test:', response.data);
  } catch (error) {
    console.error('Token registration test failed:', error);
  }
};
```

### 2. Test Notification Preferences
```javascript
// Test notification preferences
const testPreferences = async () => {
  try {
    // Get preferences
    const getResponse = await api.get('/api/mobile/notifications/preferences');
    console.log('Get preferences:', getResponse.data);

    // Update preferences
    const updateResponse = await api.put('/api/mobile/notifications/preferences', {
      eventNotifications: false,
      appUpdateNotifications: true
    });
    console.log('Update preferences:', updateResponse.data);
  } catch (error) {
    console.error('Preferences test failed:', error);
  }
};
```

## 📋 Implementation Checklist

### Backend Team
- [ ] Create FCM tokens table
- [ ] Create notification logs table
- [ ] Set up Firebase Admin SDK
- [ ] Create FCM service
- [ ] Implement token registration API
- [ ] Implement notification preferences API
- [ ] Add event notification triggers
- [ ] Add app update notification system
- [ ] Test notification sending

### Mobile Team
- [ ] Install React Native Firebase
- [ ] Configure Firebase for Android/iOS
- [ ] Implement FCM service
- [ ] Add token registration on login
- [ ] Set up notification handlers
- [ ] Implement deep linking
- [ ] Add notification preferences UI
- [ ] Test notification reception
- [ ] Test notification tap handling

## 🚨 Important Notes

### Security
- FCM tokens are sensitive - handle them securely
- Validate tokens on backend before sending notifications
- Implement rate limiting for notification APIs

### Performance
- Batch notification sending for large user bases
- Implement retry logic for failed notifications
- Clean up inactive tokens regularly

### User Experience
- Always request permission before registering tokens
- Provide clear opt-in/opt-out options
- Handle notification permissions gracefully
- Test on both Android and iOS devices

## 📞 Support & Communication

### Backend Team Contact
- **Lead Developer**: [Your Name]
- **Email**: [Your Email]
- **Slack**: [Your Slack Handle]

### Mobile Team Contact
- **Lead Developer**: [Mobile Team Lead]
- **Email**: [Mobile Team Email]
- **Slack**: [Mobile Team Slack]

### Communication Channels
- **Daily Standups**: [Time & Platform]
- **Slack Channel**: #fcm-notifications
- **Documentation**: This file + API documentation

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | [Current Date] | Initial implementation guide |

---

**Last Updated**: [Current Date]  
**Next Review**: [Date + 1 week]  
**Status**: Ready for Implementation
