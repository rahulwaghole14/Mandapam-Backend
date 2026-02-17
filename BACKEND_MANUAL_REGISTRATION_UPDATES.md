# Manual Registration Form Backend Updates

## Overview
This document outlines the backend changes required to support the updated manual registration form where:
- Business Type is now optional (previously required)
- Profile Photo is now optional (previously required) 
- New Cash Receipt Number field added (for cash payments only)

## Changes Made

### 1. Database Schema Changes

#### A. Members Table - business_type Column
- **Change**: Made `business_type` column nullable
- **Previous**: `NOT NULL` with validation
- **Now**: `NULLABLE` - optional field
- **Migration**: `20240217_make_business_type_nullable.js`

#### B. Event Registrations Table - cash_receipt_number Column
- **Change**: Added new `cash_receipt_number` column
- **Type**: `VARCHAR(100)`
- **Nullable**: Yes
- **Purpose**: Store cash receipt numbers for manual registrations
- **Migration**: `20240217_add_cash_receipt_number.js`

### 2. Model Updates

#### EventRegistration Model
```javascript
// Added new field
cashReceiptNumber: {
  type: DataTypes.STRING(100),
  allowNull: true,
  field: 'cash_receipt_number'
}
```

#### Member Model
```javascript
// Updated field
businessType: {
  type: DataTypes.ENUM('catering', 'sound', 'mandap', 'light', 'decorator', 'photography', 'videography', 'transport', 'other'),
  allowNull: true, // Changed from false
  field: 'business_type'
}
```

### 3. API Endpoint Updates

#### Manual Registration Endpoint
- **Route**: `POST /api/events/:id/manual-registration`
- **Changes**:
  - Removed required validation for `businessType`
  - Added optional validation for `cashReceiptNumber`
  - Updated request handling to include `cashReceiptNumber`
  - Updated member creation logic to handle optional `businessType`

#### Validation Changes
```javascript
// Before
body('businessType', 'Business type is required')
  .isIn(['catering', 'sound', 'mandap', 'light', 'decorator', 'photography', 'videography', 'transport', 'other'])

// After  
body('businessType').optional({ checkFalsy: true })
  .isIn(['catering', 'sound', 'mandap', 'light', 'decorator', 'photography', 'videography', 'transport', 'other'])

// New field
body('cashReceiptNumber').optional({ checkFalsy: true })
  .trim().isLength({ max: 100 })
  .withMessage('Cash receipt number must be less than 100 characters')
```

### 4. Business Logic Updates

#### findOrCreateMember Function
- Removed validation that required `businessType`
- Now handles `businessType` as optional parameter
- Maintains backward compatibility with existing members

#### Registration Creation
- Added `cashReceiptNumber` to registration creation
- Updated logging to include cash receipt number (masked for security)

## Production Deployment Steps

### 1. Database Migrations
Run the migration script to update the database schema:

```bash
cd /path/to/backend
node scripts/apply_manual_registration_updates.js
```

Or run migrations individually:
```bash
# Migration 1: Make business_type nullable
npx sequelize-cli db:migrate --migrations-path ./migrations/20240217_make_business_type_nullable.js

# Migration 2: Add cash_receipt_number column  
npx sequelize-cli db:migrate --migrations-path ./migrations/20240217_add_cash_receipt_number.js
```

### 2. Code Deployment
Deploy the updated backend code with the following changes:
- Updated models (EventRegistration.js, Member.js)
- Updated validation in eventRoutes.js
- Updated findOrCreateMember function

### 3. Verification
After deployment, verify the changes:

1. **Test Manual Registration**:
   ```bash
   curl -X POST https://your-backend.com/api/events/1/manual-registration \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test User",
       "phone": "1234567890", 
       "businessName": "Test Business",
       "paymentMethod": "cash",
       "cashReceiptNumber": "CR12345"
     }'
   ```

2. **Check Database**:
   ```sql
   -- Verify business_type can be NULL
   SELECT COUNT(*) FROM members WHERE business_type IS NULL;
   
   -- Verify cash_receipt_number column exists
   SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'event_registrations' 
   AND column_name = 'cash_receipt_number';
   ```

## Backward Compatibility

### Existing Data
- All existing members with business_type values remain unchanged
- Existing registrations continue to work normally
- No data loss or corruption risks

### API Compatibility
- Frontend can still send businessType (optional)
- Old API clients that send businessType will continue to work
- New API clients can omit businessType and include cashReceiptNumber

## Security Considerations

### Cash Receipt Numbers
- Treated as optional field with length validation (max 100 chars)
- Logged with masking (*** pattern) for security
- No sensitive data exposure in logs

### Input Validation
- All new fields properly sanitized
- Length limits enforced
- Type validation maintained

## Rollback Plan

If issues arise, rollback steps:

1. **Database Rollback**:
   ```bash
   # Reverse migrations
   npx sequelize-cli db:migrate:undo --to 20240217_make_business_type_nullable.js
   npx sequelize-cli db:migrate:undo --to 20240217_add_cash_receipt_number.js
   ```

2. **Code Rollback**:
   - Revert EventRegistration.js model changes
   - Revert Member.js model changes  
   - Revert eventRoutes.js validation changes
   - Revert findOrCreateMember function

## Testing Checklist

- [ ] Manual registration without business type
- [ ] Manual registration without profile photo
- [ ] Manual registration with cash receipt number
- [ ] Manual registration without cash receipt number
- [ ] Existing registrations still work
- [ ] Database schema updated correctly
- [ ] API validation works properly
- [ ] Logging includes new fields (masked)
- [ ] Error handling for invalid inputs

## Support Contact

For any issues with these changes:
- Backend Development Team
- Database Administrator
- DevOps Team (for deployment issues)

---
**Implementation Date**: 2026-02-17  
**Version**: 1.0  
**Priority**: High (Frontend changes already deployed)
