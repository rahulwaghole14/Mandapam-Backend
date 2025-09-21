# WhatsApp OTP Setup Guide

## 🚀 Quick Setup Steps

### Step 1: Create Database Table
Run the SQL script `whatsapp_database_setup.sql` on your live database:

```sql
-- Copy and paste this into your database management tool (pgAdmin, DBeaver, etc.)
-- or run via command line:

psql -h your-db-host -U your-username -d your-database -f whatsapp_database_setup.sql
```

### Step 2: Configure WhatsApp Credentials
1. **Access Admin Panel**: Go to your web admin panel
2. **Navigate to WhatsApp Settings**: Look for WhatsApp configuration section
3. **Enter Credentials**:
   - **Instance ID**: `68CE3F768E38B` (from your API example)
   - **Access Token**: `68cd1d45c0af2` (from your API example)
   - **Enable**: Check the "Active" checkbox

### Step 3: Test WhatsApp OTP
1. **Test via Mobile App**: Try logging in with a real phone number
2. **Check Server Logs**: Should see "WhatsApp OTP sent successfully"
3. **Verify Delivery**: Check if OTP arrives via WhatsApp

## 📋 API Endpoints for Configuration

### Get WhatsApp Status
```bash
GET /api/whatsapp/status
Authorization: Bearer <admin-token>
```

### Save WhatsApp Configuration
```bash
POST /api/whatsapp/save
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "instanceId": "68CE3F768E38B",
  "accessToken": "68cd1d45c0af2",
  "isActive": true
}
```

### Test WhatsApp Configuration
```bash
POST /api/whatsapp/test
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "phoneNumber": "917400332815",
  "message": "Test message from Mandapam"
}
```

## 🔧 Manual Database Configuration (Alternative)

If you prefer to configure directly in the database:

```sql
-- Update the configuration
UPDATE whatsapp_config 
SET 
    instance_id = '68CE3F768E38B',
    access_token = '68cd1d45c0af2',
    is_active = true,
    updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- Verify the configuration
SELECT * FROM whatsapp_config;
```

## 📱 Phone Number Format

The system automatically formats phone numbers as `91{10-digit}`:
- Input: `9960769171`
- Formatted: `919960769171`
- API Call: `https://alldigimkt.org/api/send?number=919960769171&...`

## 🎯 Expected Behavior After Setup

### Before Setup (Current):
```
WhatsApp OTP failed for 9960769171: WhatsApp service is not configured or enabled
OTP sent successfully to your mobile number (console)
```

### After Setup:
```
WhatsApp OTP sent successfully to 919960769171
OTP sent successfully to your mobile number (whatsapp)
```

## 🚨 Troubleshooting

### If WhatsApp Still Fails:
1. **Check Credentials**: Verify instance ID and access token
2. **Check API Status**: Test the WhatsApp API directly
3. **Check Phone Format**: Ensure numbers are formatted as 91XXXXXXXXXX
4. **Check Logs**: Look for specific error messages

### If Database Issues:
1. **Check Table**: Verify `whatsapp_config` table exists
2. **Check Permissions**: Ensure user has INSERT/UPDATE permissions
3. **Check Foreign Key**: Verify `users` table has ID 1

## ✅ Verification Checklist

- [ ] Database table created successfully
- [ ] WhatsApp credentials configured
- [ ] Configuration marked as active
- [ ] Test message sent successfully
- [ ] Mobile app receives WhatsApp OTP
- [ ] Server logs show "WhatsApp OTP sent successfully"

## 📞 Support

If you encounter any issues:
1. Check server logs for specific error messages
2. Verify WhatsApp API credentials are correct
3. Test with a known working phone number
4. Ensure database table was created properly

---

**Note**: The system will continue to work with console OTP fallback even if WhatsApp fails, so there's no risk to existing functionality.
