# 🚀 Render Deployment Guide - Mandap Backend with PostgreSQL

## 📋 **Prerequisites**
- GitHub repository with your code (✅ Already done)
- Render account (free tier available)
- PostgreSQL database on Render

## 🗄️ **Step 1: Create PostgreSQL Database on Render**

1. **Go to Render Dashboard**
   - Visit: https://dashboard.render.com
   - Sign in to your account

2. **Create New PostgreSQL Database**
   - Click "New +" → "PostgreSQL"
   - **Name**: `mandap-postgres-db`
   - **Database**: `mandap_db`
   - **User**: `mandap_user`
   - **Region**: Choose closest to your users (e.g., Oregon for US)
   - **Plan**: Free (for development) or Starter ($7/month for production)

3. **Save Database Credentials**
   - Copy the **External Database URL** (starts with `postgresql://`)
   - This will be your `DATABASE_URL` environment variable

## 🌐 **Step 2: Create Web Service on Render**

1. **Create New Web Service**
   - Click "New +" → "Web Service"
   - **Connect Repository**: Choose your GitHub repository
   - **Branch**: `main`

2. **Configure Build Settings**
   - **Name**: `mandap-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server.js`
   - **Plan**: Free (for development) or Starter ($7/month for production)

3. **Environment Variables**
   Add these environment variables in Render dashboard:
   ```
   NODE_ENV=production
   DATABASE_URL=postgresql://mandap_user:password@host:port/mandap_db
   JWT_SECRET=your-super-secret-jwt-key-here
   PORT=10000
   ```

## 🔧 **Step 3: Update Package.json (if needed)**

Ensure your `package.json` has the correct start script:
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

## 📁 **Step 4: Create Render Configuration Files**

### **render.yaml** (Optional - for advanced configuration)
```yaml
services:
  - type: web
    name: mandap-backend
    env: node
    buildCommand: npm install
    startCommand: node server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: mandap-postgres-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true
      - key: PORT
        value: 10000
```

## 🚀 **Step 5: Deploy**

1. **Manual Deploy**
   - Click "Deploy" in Render dashboard
   - Wait for build to complete (5-10 minutes)

2. **Automatic Deploy**
   - Every push to `main` branch will auto-deploy
   - Check deployment logs for any issues

## 🔍 **Step 6: Verify Deployment**

1. **Check Health Endpoint**
   ```
   GET https://your-app-name.onrender.com/api/health
   ```

2. **Test Mobile APIs**
   ```
   POST https://your-app-name.onrender.com/api/mobile/send-otp
   Content-Type: application/json
   
   {
     "mobileNumber": "9876543210"
   }
   ```

## 📊 **Step 7: Database Setup**

After deployment, you need to create the database tables:

1. **Option A: Auto-sync (Development)**
   - The app will auto-create tables on first run
   - Check logs for "Database synchronized successfully"

2. **Option B: Manual Migration (Production)**
   - Connect to your PostgreSQL database
   - Run the table creation scripts manually

## 🔐 **Step 8: Security Configuration**

1. **Environment Variables**
   - Never commit sensitive data to git
   - Use Render's environment variable system
   - Generate strong JWT secrets

2. **CORS Configuration**
   - Update CORS settings for your frontend domain
   - Add your mobile app's domain to allowed origins

## 📱 **Step 9: Mobile App Integration**

Update your mobile app's API base URL:
```javascript
// Development
const API_BASE_URL = 'http://localhost:5000';

// Production
const API_BASE_URL = 'https://your-app-name.onrender.com';
```

## 🐛 **Troubleshooting**

### **Common Issues:**

1. **Build Failures**
   - Check `package.json` dependencies
   - Ensure all required packages are listed
   - Check build logs in Render dashboard

2. **Database Connection Issues**
   - Verify `DATABASE_URL` is correct
   - Check database is running
   - Ensure SSL is enabled for external connections

3. **Environment Variables**
   - Double-check all required variables are set
   - Ensure no typos in variable names
   - Restart service after adding new variables

4. **Port Issues**
   - Render uses port 10000 by default
   - Update your app to use `process.env.PORT || 5000`

## 📈 **Monitoring & Scaling**

1. **Free Tier Limits**
   - 750 hours/month
   - Sleeps after 15 minutes of inactivity
   - Cold start takes ~30 seconds

2. **Upgrade to Paid Plan**
   - Always-on service
   - Better performance
   - Custom domains
   - SSL certificates

## 🔄 **Continuous Deployment**

- Every push to `main` branch auto-deploys
- Check deployment status in Render dashboard
- Monitor logs for any runtime errors

## 📞 **Support**

- Render Documentation: https://render.com/docs
- Render Community: https://community.render.com
- Status Page: https://status.render.com

---

## ✅ **Deployment Checklist**

- [ ] PostgreSQL database created
- [ ] Web service created
- [ ] Environment variables configured
- [ ] Code pushed to GitHub
- [ ] Deployment successful
- [ ] Health endpoint working
- [ ] Database tables created
- [ ] Mobile APIs tested
- [ ] CORS configured
- [ ] SSL certificate active

**Your Mandap Backend is now live on Render! 🎉**