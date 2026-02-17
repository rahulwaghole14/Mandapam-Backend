# 🐘 PostgreSQL Setup Guide

## **Step 1: Install PostgreSQL**

### **Windows:**
1. Download PostgreSQL from [postgresql.org](https://www.postgresql.org/download/windows/)
2. Run the installer
3. Remember the password you set for the `postgres` user
4. Start PostgreSQL service: `net start postgresql-x64-14`

### **macOS:**
```bash
# Using Homebrew
brew install postgresql
brew services start postgresql

# Or download from postgresql.org
```

### **Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## **Step 2: Create Environment File**

Create a `.env` file in your project root with:

```env
# Local PostgreSQL Configuration
NODE_ENV=development
PORT=5000

# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=mandap_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_postgres_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-for-development
JWT_EXPIRE=24h

# File Upload Configuration
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## **Step 3: Setup Database**

Run the setup script:
```bash
node scripts/setup-postgres.js
```

## **Step 4: Run Migration**

```bash
node scripts/migrate-to-postgres.js
```

## **Step 5: Test Application**

```bash
npm start
```

---

## **Cloud PostgreSQL Options**

### **Option A: Render PostgreSQL**
1. Go to [render.com](https://render.com)
2. Create new PostgreSQL service
3. Copy the connection string
4. Use as `DATABASE_URL` in environment variables

### **Option B: AWS RDS**
1. Create PostgreSQL instance in AWS RDS
2. Configure security groups
3. Get connection details
4. Update environment variables

### **Option C: Heroku PostgreSQL**
1. Add PostgreSQL addon to Heroku app
2. Get connection string from Heroku config
3. Use as `DATABASE_URL`

---

## **Troubleshooting**

### **Connection Issues:**
- Check PostgreSQL is running
- Verify credentials in .env file
- Check firewall settings
- Ensure database exists

### **Permission Issues:**
- Grant proper permissions to user
- Check user roles and privileges

### **Port Issues:**
- Default PostgreSQL port is 5432
- Check if port is available
- Update port in configuration if needed
