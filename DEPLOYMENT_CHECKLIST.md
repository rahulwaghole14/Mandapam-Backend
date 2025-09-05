# 🚀 Deployment Checklist - Render with PostgreSQL

## ✅ **Pre-Deployment Checklist**

### **1. Code Preparation**
- [x] All code committed and pushed to GitHub
- [x] MongoDB to PostgreSQL migration complete
- [x] All mobile APIs tested and working
- [x] Server.js configured for production (PORT environment variable)
- [x] Package.json has correct start script

### **2. Database Setup**
- [ ] Create PostgreSQL database on Render
- [ ] Copy DATABASE_URL from Render dashboard
- [ ] Test database connection locally with production URL

### **3. Environment Variables**
Set these in Render dashboard:
- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL=postgresql://...` (from Render database)
- [ ] `JWT_SECRET=your-super-secret-key`
- [ ] `PORT=10000` (Render default)

## 🚀 **Deployment Steps**

### **Step 1: Create PostgreSQL Database**
1. Go to https://dashboard.render.com
2. Click "New +" → "PostgreSQL"
3. Name: `mandap-postgres-db`
4. Plan: Free (development) or Starter ($7/month production)
5. Copy the External Database URL

### **Step 2: Create Web Service**
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Branch: `main`
4. Build Command: `npm install`
5. Start Command: `node server.js`
6. Plan: Free (development) or Starter ($7/month production)

### **Step 3: Configure Environment Variables**
In Render dashboard, add:
```
NODE_ENV=production
DATABASE_URL=postgresql://username:password@host:port/database
JWT_SECRET=your-super-secret-jwt-key-here
PORT=10000
```

### **Step 4: Deploy**
1. Click "Deploy" button
2. Wait for build to complete (5-10 minutes)
3. Check deployment logs for errors

## 🔍 **Post-Deployment Verification**

### **1. Health Check**
Test: `GET https://your-app-name.onrender.com/api/health`
Expected: 200 OK with server info

### **2. Database Connection**
Check logs for: "✅ PostgreSQL Connected Successfully"

### **3. Mobile API Test**
```bash
curl -X POST https://your-app-name.onrender.com/api/mobile/send-otp \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber": "9876543210"}'
```

### **4. Database Tables**
Check logs for: "✅ Database synchronized successfully"

## 🐛 **Troubleshooting**

### **Common Issues:**

**Build Fails:**
- Check package.json dependencies
- Ensure all required packages are listed
- Check build logs in Render dashboard

**Database Connection Fails:**
- Verify DATABASE_URL is correct
- Check database is running
- Ensure SSL is enabled

**App Crashes on Start:**
- Check environment variables
- Verify PORT is set to 10000
- Check server.js for any hardcoded values

**APIs Return 500 Errors:**
- Check database tables are created
- Verify model field mappings
- Check CORS configuration

## 📱 **Mobile App Integration**

Update your mobile app's API base URL:
```javascript
// Development
const API_BASE_URL = 'http://localhost:5000';

// Production  
const API_BASE_URL = 'https://your-app-name.onrender.com';
```

## 🔐 **Security Notes**

1. **JWT Secret**: Use a strong, random secret key
2. **CORS**: Configure for your frontend domains
3. **Environment Variables**: Never commit sensitive data
4. **SSL**: Render provides free SSL certificates

## 📊 **Monitoring**

1. **Render Dashboard**: Monitor service health
2. **Logs**: Check for errors and performance
3. **Database**: Monitor connection and queries
4. **Uptime**: Free tier sleeps after 15 minutes

## 🎯 **Production Optimizations**

1. **Upgrade to Paid Plan**: For always-on service
2. **Custom Domain**: Add your own domain
3. **CDN**: For static file serving
4. **Monitoring**: Add application monitoring
5. **Backup**: Regular database backups

---

## 🎉 **Success Criteria**

Your deployment is successful when:
- [ ] Health endpoint returns 200 OK
- [ ] Database connection established
- [ ] Mobile APIs respond correctly
- [ ] No errors in deployment logs
- [ ] SSL certificate active
- [ ] Mobile app can connect to APIs

**Your Mandap Backend is now live! 🚀**