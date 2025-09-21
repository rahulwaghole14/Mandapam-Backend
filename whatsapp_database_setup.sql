-- WhatsApp Configuration Table Setup
-- Run this script on your live database to enable WhatsApp OTP functionality

-- Create whatsapp_config table
CREATE TABLE IF NOT EXISTS whatsapp_config (
    id SERIAL PRIMARY KEY,
    instance_id VARCHAR(255) NOT NULL,
    access_token VARCHAR(500) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_active ON whatsapp_config(is_active);
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_created_by ON whatsapp_config(created_by);

-- Insert a default inactive configuration (you can activate it later)
INSERT INTO whatsapp_config (instance_id, access_token, is_active, created_by) 
VALUES ('DEFAULT_INSTANCE', 'DEFAULT_TOKEN', false, 1)
ON CONFLICT DO NOTHING;

-- Verify the table was created
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'whatsapp_config'
ORDER BY ordinal_position;

-- Show current configuration
SELECT * FROM whatsapp_config;
