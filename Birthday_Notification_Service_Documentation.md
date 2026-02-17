# 🎂 Birthday Notification Service Documentation

## Overview

The Birthday Notification Service automatically sends push notifications to members on their birthday at 9:00 AM IST daily. This service includes a comprehensive scheduler, statistics tracking, and admin management capabilities.

## 🚀 Features

- **Automatic Daily Notifications**: Sends birthday wishes at 9:00 AM IST
- **Member Birthday Detection**: Automatically identifies members with birthdays
- **Push Notification Integration**: Uses FCM for mobile notifications
- **Admin Management**: Complete admin interface for monitoring and control
- **Statistics & Analytics**: Detailed birthday statistics and reporting
- **Manual Triggers**: Ability to manually send notifications for testing
- **Scheduler Management**: Start/stop scheduler functionality

## 🕘 Scheduling Details

- **Time**: 9:00 AM IST (3:30 AM UTC)
- **Frequency**: Daily
- **Timezone**: Asia/Kolkata (IST)
- **Cron Expression**: `30 3 * * *`

## 📊 Service Components

### 1. BirthdayNotificationService
Core service handling birthday logic and notifications.

### 2. SchedulerService
Manages cron jobs and scheduling functionality.

### 3. Birthday API Routes
Admin endpoints for managing birthday notifications.

## 🔧 API Endpoints

### Get Birthday Statistics
```http
GET /api/birthday/stats
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "stats": {
    "currentMonth": 9,
    "currentYear": 2025,
    "todayBirthdays": 1,
    "monthStats": {
      "2025-09-01": 5,
      "2025-09-02": 3,
      "2025-09-19": 1
    },
    "totalMembersWithBirthdays": 9898
  }
}
```

### Get Members with Birthday Today
```http
GET /api/birthday/today
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "count": 1,
  "members": [
    {
      "id": 505,
      "name": "Jaideep Bajirao Patil",
      "businessName": "Shiv Decoration",
      "birthDate": "1991-09-19",
      "phone": "+919876543210",
      "email": "jaideep@example.com"
    }
  ]
}
```

### Manually Trigger Birthday Notifications
```http
POST /api/birthday/send-notifications
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Birthday notifications triggered successfully",
  "result": {
    "success": true,
    "message": "Birthday notifications processed for 1 members",
    "totalMembers": 1,
    "notificationsSent": 1,
    "notificationsFailed": 0,
    "results": [
      {
        "success": true,
        "memberId": 505,
        "memberName": "Jaideep Bajirao Patil",
        "notificationSent": true,
        "message": "Birthday notification sent to Jaideep Bajirao Patil"
      }
    ]
  }
}
```

### Test Birthday Notification for Specific Member
```http
POST /api/birthday/test/:memberId
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Test birthday notification completed",
  "result": {
    "success": true,
    "testResult": {
      "success": true,
      "memberId": 505,
      "memberName": "Jaideep Bajirao Patil",
      "notificationSent": true,
      "message": "Birthday notification sent to Jaideep Bajirao Patil"
    },
    "message": "Test birthday notification sent to Jaideep Bajirao Patil"
  }
}
```

### Get Scheduler Status
```http
GET /api/birthday/scheduler/status
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "scheduler": {
    "isRunning": true,
    "jobs": [
      {
        "name": "birthdayNotifications",
        "running": true,
        "nextRun": "2025-09-20T03:30:00.000Z"
      }
    ]
  }
}
```

### Start Scheduler
```http
POST /api/birthday/scheduler/start
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Scheduler started successfully"
}
```

### Stop Scheduler
```http
POST /api/birthday/scheduler/stop
Authorization: Bearer <admin_token>
```

**Response:**
```json
{
  "success": true,
  "message": "Scheduler stopped successfully"
}
```

## 📱 Push Notification Details

### Notification Structure
```json
{
  "title": "🎂 Happy Birthday!",
  "body": "Wishing you a very happy birthday, [Member Name]! 🎉",
  "data": {
    "type": "birthday",
    "memberId": "505",
    "memberName": "Jaideep Bajirao Patil",
    "businessName": "Shiv Decoration",
    "action": "birthday_wish"
  }
}
```

### Notification Behavior
- **Target**: Only members with active FCM tokens
- **Timing**: 9:00 AM IST daily
- **Personalization**: Includes member name in message
- **Data Payload**: Contains member information for app handling

## 🔍 Business Logic

### Birthday Detection
1. **Date Comparison**: Compares current date with member's birth date
2. **Month/Day Match**: Only matches month and day (ignores year)
3. **Active Members**: Only processes active members
4. **Birth Date Required**: Members must have birth date recorded

### Notification Process
1. **Daily Scan**: Automatically scans for birthday members
2. **FCM Token Check**: Verifies member has active FCM token
3. **Notification Send**: Sends personalized birthday message
4. **Logging**: Records notification attempt and result
5. **Error Handling**: Gracefully handles failed notifications

### Scheduler Management
1. **Auto Start**: Starts automatically when server starts
2. **Graceful Shutdown**: Stops cleanly on server shutdown
3. **Status Monitoring**: Provides real-time scheduler status
4. **Manual Control**: Admin can start/stop scheduler

## 🛠️ Technical Implementation

### Dependencies
- `node-cron`: Cron job scheduling
- `sequelize`: Database operations
- `fcmService`: Push notification handling

### Database Requirements
- `members` table with `birth_date` column
- `fcm_tokens` table for push notification tokens
- `notification_logs` table for tracking

### Error Handling
- **Database Errors**: Graceful handling of DB connection issues
- **FCM Errors**: Continues processing even if individual notifications fail
- **Scheduler Errors**: Logs errors without crashing the service
- **Validation**: Validates member data before processing

## 📈 Monitoring & Analytics

### Statistics Available
- **Today's Birthdays**: Count of members with birthday today
- **Monthly Stats**: Birthday distribution by day
- **Total Members**: Members with recorded birth dates
- **Notification Success**: Success/failure rates

### Logging
- **Console Logs**: Detailed logging for debugging
- **Notification Logs**: Database tracking of all notifications
- **Error Logs**: Comprehensive error logging
- **Performance Logs**: Timing and performance metrics

## 🧪 Testing

### Manual Testing
```bash
# Test birthday statistics
curl -H "Authorization: Bearer <token>" \
     http://localhost:5000/api/birthday/stats

# Test manual trigger
curl -X POST -H "Authorization: Bearer <token>" \
     http://localhost:5000/api/birthday/send-notifications

# Test specific member
curl -X POST -H "Authorization: Bearer <token>" \
     http://localhost:5000/api/birthday/test/505
```

### Automated Testing
- **Unit Tests**: Individual service method testing
- **Integration Tests**: End-to-end notification flow
- **Scheduler Tests**: Cron job functionality
- **Error Tests**: Error handling scenarios

## 🚀 Deployment

### Production Setup
1. **Environment Variables**: Ensure proper FCM configuration
2. **Database**: Verify member birth dates are populated
3. **Timezone**: Confirm IST timezone settings
4. **Monitoring**: Set up logging and monitoring

### Maintenance
- **Regular Monitoring**: Check scheduler status daily
- **Birth Date Updates**: Ensure member birth dates are accurate
- **FCM Token Management**: Monitor token registration rates
- **Performance**: Monitor notification delivery rates

## 🔒 Security

### Access Control
- **Admin Only**: All endpoints require admin authentication
- **Token Validation**: Proper JWT token validation
- **Rate Limiting**: Protection against abuse
- **Input Validation**: Sanitized inputs and parameters

### Data Privacy
- **Member Data**: Only necessary data included in notifications
- **Logging**: Sensitive data excluded from logs
- **FCM Tokens**: Secure token handling
- **Database**: Proper data encryption and access controls

## 📞 Support

### Troubleshooting
1. **No Notifications**: Check FCM token registration
2. **Scheduler Issues**: Verify cron job status
3. **Database Errors**: Check member birth date data
4. **FCM Errors**: Verify Firebase configuration

### Common Issues
- **Missing Birth Dates**: Members without birth dates won't receive notifications
- **Inactive FCM Tokens**: Only active tokens receive notifications
- **Timezone Issues**: Ensure server timezone is correct
- **Database Connectivity**: Verify database connection

## 🎯 Future Enhancements

### Planned Features
- **Birthday Reminders**: Notifications before birthday
- **Custom Messages**: Personalized birthday messages
- **Analytics Dashboard**: Visual birthday statistics
- **Bulk Operations**: Mass birthday data management
- **Integration**: Calendar and event system integration

### Scalability
- **Queue System**: Redis-based job queue for large volumes
- **Batch Processing**: Process notifications in batches
- **Caching**: Redis caching for performance
- **Load Balancing**: Multiple server instances

---

## 📋 Quick Reference

### Key Files
- `services/birthdayNotificationService.js` - Core birthday logic
- `services/schedulerService.js` - Cron job management
- `routes/birthdayRoutes.js` - API endpoints
- `server.js` - Scheduler integration

### Key Commands
```bash
# Start server (auto-starts scheduler)
npm start

# Check scheduler status
curl -H "Authorization: Bearer <token>" \
     http://localhost:5000/api/birthday/scheduler/status

# Manual notification trigger
curl -X POST -H "Authorization: Bearer <token>" \
     http://localhost:5000/api/birthday/send-notifications
```

### Key Environment Variables
- `FIREBASE_PROJECT_ID` - Firebase project configuration
- `FIREBASE_PRIVATE_KEY` - Firebase service account key
- `FIREBASE_CLIENT_EMAIL` - Firebase service account email
- `NODE_ENV` - Environment (development/production)

---

**Last Updated**: September 19, 2025  
**Version**: 1.0.0  
**Author**: Development Team
