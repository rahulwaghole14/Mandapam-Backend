# Running SQL Script on Render Database

## 🚀 Method 1: Using Render Shell (Recommended)

### Step 1: Access Render Shell
1. Go to your Render dashboard
2. Navigate to your backend service
3. Click on "Shell" tab
4. This will open a terminal connected to your Render instance

### Step 2: Connect to Database
In the Render shell, run:
```bash
# Connect to your PostgreSQL database
psql $DATABASE_URL
```

### Step 3: Run the SQL Script
Once connected to the database, run:
```sql
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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_active ON whatsapp_config(is_active);
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_created_by ON whatsapp_config(created_by);

-- Insert default configuration
INSERT INTO whatsapp_config (instance_id, access_token, is_active, created_by) 
VALUES ('DEFAULT_INSTANCE', 'DEFAULT_TOKEN', false, 1)
ON CONFLICT DO NOTHING;

-- Verify table creation
\dt whatsapp_config

-- Check the data
SELECT * FROM whatsapp_config;
```

### Step 4: Exit Database
```sql
\q
```

## 🔧 Method 2: Using Environment Variables

If you have the database URL, you can also run:
```bash
# In Render shell
psql $DATABASE_URL -c "
CREATE TABLE IF NOT EXISTS whatsapp_config (
    id SERIAL PRIMARY KEY,
    instance_id VARCHAR(255) NOT NULL,
    access_token VARCHAR(500) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"
```

## 📋 Method 3: Using a Migration Script

Create a temporary migration file and run it:

### Step 1: Create migration file
```bash
# In Render shell
cat > whatsapp_migration.sql << 'EOF'
CREATE TABLE IF NOT EXISTS whatsapp_config (
    id SERIAL PRIMARY KEY,
    instance_id VARCHAR(255) NOT NULL,
    access_token VARCHAR(500) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_config_active ON whatsapp_config(is_active);
CREATE INDEX IF NOT EXISTS idx_whatsapp_config_created_by ON whatsapp_config(created_by);

INSERT INTO whatsapp_config (instance_id, access_token, is_active, created_by) 
VALUES ('DEFAULT_INSTANCE', 'DEFAULT_TOKEN', false, 1)
ON CONFLICT DO NOTHING;
EOF
```

### Step 2: Run the migration
```bash
psql $DATABASE_URL -f whatsapp_migration.sql
```

### Step 3: Clean up
```bash
rm whatsapp_migration.sql
```

## ✅ Verification Commands

After running the SQL, verify it worked:

```sql
-- Check if table exists
\dt whatsapp_config

-- Check table structure
\d whatsapp_config

-- Check data
SELECT * FROM whatsapp_config;

-- Check indexes
\di whatsapp_config*
```

## 🚨 Troubleshooting

### If you get permission errors:
```bash
# Check if you're connected to the right database
\conninfo

# Check current user permissions
\du
```

### If table already exists:
```sql
-- Drop and recreate (be careful!)
DROP TABLE IF EXISTS whatsapp_config CASCADE;
-- Then run the CREATE TABLE command again
```

### If you can't access Render shell:
- Make sure your service is running
- Check if shell access is enabled in your Render plan
- Try restarting your service first

## 🎯 Expected Output

After successful execution, you should see:
```
CREATE TABLE
CREATE INDEX
CREATE INDEX
INSERT 0 1
```

And when you check the data:
```
 id |   instance_id    | access_token | is_active | created_by | created_at | updated_at 
----+-----------------+--------------+-----------+------------+------------+------------
  1 | DEFAULT_INSTANCE | DEFAULT_TOKEN| f         |          1 | 2024-01-XX | 2024-01-XX
```

## 📞 Next Steps After Database Setup

1. **Configure WhatsApp credentials** via admin panel
2. **Test WhatsApp OTP** with a real phone number
3. **Verify server logs** show "WhatsApp OTP sent successfully"

---

**Note**: The `$DATABASE_URL` environment variable should already be set in your Render instance. If not, you'll need to get the connection string from your Render database service.
