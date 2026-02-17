# 🐘 PostgreSQL Migration - Step by Step Guide

## ✅ **Progress Status**

- [x] **Step 1**: Dependencies updated (Sequelize, pg, pg-hstore)
- [x] **Step 2**: Database configuration created
- [x] **Step 3**: Models converted to Sequelize
- [x] **Step 4**: Route files updated (mobile auth, mobile members)
- [ ] **Step 5**: Test migration with sample data
- [ ] **Step 6**: Deploy to Render with PostgreSQL

---

## **Step 1: PostgreSQL Database Setup**

### **Option A: Local PostgreSQL (Development)**

#### **Windows:**
1. Download PostgreSQL from: https://www.postgresql.org/download/windows/
2. Install with default settings
3. Remember the password you set for `postgres` user
4. Start PostgreSQL service:
   ```cmd
   net start postgresql-x64-14
   ```

#### **macOS:**
```bash
# Using Homebrew
brew install postgresql
brew services start postgresql
```

#### **Linux:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### **Option B: Cloud PostgreSQL (Recommended for Production)**

#### **Render PostgreSQL:**
1. Go to [render.com](https://render.com)
2. Create new PostgreSQL service
3. Copy the connection string
4. Use as `DATABASE_URL` in environment variables

---

## **Step 2: Environment Configuration**

Create a `.env` file in your project root:

```env
# PostgreSQL Configuration
NODE_ENV=development
PORT=5000

# For local PostgreSQL:
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=mandap_db
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_postgres_password

# For cloud PostgreSQL (use this instead of above):
# DATABASE_URL=postgresql://user:pass@host:port/db

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

---

## **Step 3: Setup Database**

Run the setup script to create the database:

```bash
node scripts/setup-postgres.js
```

**Expected Output:**
```
🔌 Connecting to PostgreSQL...
✅ Connected to PostgreSQL
📊 Creating database: mandap_db
✅ Database 'mandap_db' created successfully
✅ Successfully connected to database 'mandap_db'
🎉 PostgreSQL setup completed!
```

---

## **Step 4: Run Migration**

Run the migration script to create tables and sample data:

```bash
node scripts/migrate-to-postgres.js
```

**Expected Output:**
```
🔄 Starting data migration to PostgreSQL...
✅ PostgreSQL connection established
✅ Database tables created
📊 Migrating associations...
✅ Created 2 associations
👥 Migrating users...
✅ Created 1 users
👤 Migrating members...
✅ Created 2 members
🎉 Data migration completed successfully!

📊 Migration Summary:
- Associations: 2
- Users: 1
- Members: 2
```

---

## **Step 5: Test the Application**

Start the server:

```bash
npm start
```

**Expected Output:**
```
✅ PostgreSQL Connected Successfully
✅ Database synchronized successfully
🚀 Server running on port 5000
📊 Environment: development
🔗 Health check: http://localhost:5000/health
📚 API Documentation: http://localhost:5000/api
```

---

## **Step 6: Test API Endpoints**

### **Health Check:**
```bash
curl http://localhost:5000/health
```

### **Mobile APIs:**
```bash
# Send OTP
curl -X POST http://localhost:5000/api/mobile/send-otp \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber": "9876543212"}'

# Verify OTP
curl -X POST http://localhost:5000/api/mobile/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber": "9876543212", "otp": "123456"}'

# Get today's birthdays (requires token)
curl -X GET http://localhost:5000/api/mobile/birthdays/today \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get upcoming birthdays (requires token)
curl -X GET http://localhost:5000/api/mobile/birthdays/upcoming \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## **Step 7: Deploy to Render with PostgreSQL**

### **7.1: Add PostgreSQL Service to Render**

1. Go to [render.com](https://render.com)
2. Click **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name**: `mandap-postgres`
   - **Database**: `mandap_db`
   - **User**: `mandap_user`
   - **Region**: `Oregon (US West)`
4. Click **"Create Database"**
5. Copy the **External Database URL**

### **7.2: Update Web Service Environment Variables**

In your Render web service, update environment variables:

```
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://mandap_user:password@host:port/mandap_db
JWT_SECRET=your-super-secret-jwt-key-for-production
JWT_EXPIRE=24h
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### **7.3: Deploy**

1. Push your changes to GitHub
2. Render will automatically deploy
3. Check deployment logs for any errors

---

## **Step 8: Verify Production Deployment**

### **Test Production APIs:**
```bash
# Health check
curl https://your-app-name.onrender.com/health

# Mobile APIs
curl https://your-app-name.onrender.com/api/mobile/associations
```

---

## **🔧 Troubleshooting**

### **Common Issues:**

#### **1. PostgreSQL Connection Error**
```
❌ PostgreSQL setup failed: connect ECONNREFUSED
```
**Solution:**
- Check if PostgreSQL is running
- Verify connection credentials
- Check firewall settings

#### **2. Database Permission Error**
```
❌ permission denied for database
```
**Solution:**
- Grant proper permissions to user
- Check user roles and privileges

#### **3. Model Association Error**
```
❌ Association not found
```
**Solution:**
- Check model associations in `models/index.js`
- Verify foreign key relationships

#### **4. Migration Error**
```
❌ Migration failed: relation already exists
```
**Solution:**
- Drop existing tables: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;`
- Or use `force: true` in sync options

### **Debug Commands:**
```bash
# Test database connection
node -e "require('./config/database').testConnection()"

# Check models
node -e "console.log(require('./models'))"

# Run migration
node scripts/migrate-to-postgres.js

# Test server
npm start
```

---

## **📊 What's Been Updated**

### **Models Converted:**
- ✅ User → Sequelize model
- ✅ Association → Sequelize model  
- ✅ Member → Sequelize model
- ✅ Event → Sequelize model
- ✅ Vendor → Sequelize model
- ✅ BOD → Sequelize model
- ✅ OTP → Sequelize model

### **Routes Updated:**
- ✅ `routes/mobileAuthRoutes.js` - OTP and authentication
- ✅ `routes/mobileMemberRoutes.js` - Profile and birthdays APIs
- ⏳ Other routes need updating (authRoutes, memberRoutes, etc.)

### **Key Changes:**
- `ObjectId` → `INTEGER` (auto-increment primary key)
- `findById()` → `findByPk()`
- `find()` → `findAll()` with `where` clause
- `save()` → `update()`
- `toObject()` → `toJSON()`
- MongoDB queries → Sequelize queries with `Op` operators

---

## **🎯 Next Steps**

1. **Complete Route Updates**: Update remaining route files
2. **Test All APIs**: Verify all endpoints work correctly
3. **Data Migration**: Migrate existing MongoDB data
4. **Production Deployment**: Deploy to Render with PostgreSQL
5. **Mobile App Update**: Update mobile app to use new API structure

---

## **📞 Need Help?**

If you encounter any issues:

1. Check the troubleshooting section above
2. Review the error logs in console
3. Verify environment variables
4. Test database connection
5. Check model associations

**🎉 You're making great progress! The core migration is complete and ready for testing.**
