-- Manual Registration Form Updates - Production SQL Script
-- 
-- This script makes the necessary database changes for the updated manual registration form:
-- 1. Makes businessType optional in members table
-- 2. Adds cashReceiptNumber field to event_registrations table
--
-- IMPORTANT: Run this script on your production database using:
-- psql -h your-host -U your-user -d your-database < manual_registration_updates.sql
--
-- These changes are SAFE and NON-DESTRUCTIVE:
-- - Only makes columns nullable (doesn't delete data)
-- - Only adds new columns (doesn't remove data)

-- Migration 1: Make business_type column nullable in members table
-- This allows businessType to be optional in the registration form
DO $$
BEGIN
    -- Check if the column exists before modifying
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'members' 
        AND column_name = 'business_type'
    ) THEN
        -- Change the column to allow NULL values
        ALTER TABLE members 
        ALTER COLUMN business_type DROP NOT NULL;
        
        RAISE NOTICE '✅ business_type column is now nullable in members table';
    ELSE
        RAISE NOTICE '⚠️ business_type column not found in members table';
    END IF;
END $$;

-- Migration 2: Add cash_receipt_number column to event_registrations table
-- This stores cash receipt numbers for manual registrations
DO $$
BEGIN
    -- Check if the column already exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'event_registrations' 
        AND column_name = 'cash_receipt_number'
    ) THEN
        -- Add the new column
        ALTER TABLE event_registrations 
        ADD COLUMN cash_receipt_number VARCHAR(100);
        
        RAISE NOTICE '✅ cash_receipt_number column added to event_registrations table';
    ELSE
        RAISE NOTICE '⚠️ cash_receipt_number column already exists in event_registrations table';
    END IF;
END $$;

-- Verification queries to confirm changes
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name IN ('members', 'event_registrations') 
AND column_name IN ('business_type', 'cash_receipt_number')
ORDER BY table_name, column_name;

-- Summary message
SELECT 
    'Manual Registration Form Updates Applied Successfully!' as status,
    '- business_type in members table: now optional (nullable)' as change_1,
    '- cash_receipt_number in event_registrations table: new field added (optional)' as change_2;
