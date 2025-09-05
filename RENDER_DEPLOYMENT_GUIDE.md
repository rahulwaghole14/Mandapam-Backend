# 🚀 Render Deployment Guide for Mandap Backend

This guide will help you deploy your Node.js backend to Render.com.

## 📋 Prerequisites

1. **GitHub Repository**: Your code should be in a GitHub repository
2. **Render Account**: Sign up at [render.com](https://render.com)
3. **MongoDB Atlas**: Cloud database (already configured)

## 🔧 Step 1: Prepare Your Repository

### 1.1 Commit All Changes
```bash
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### 1.2 Verify Files
Make sure these files are in your repository:
- ✅ `package.json` (with build scripts)
- ✅ `render.yaml` (deployment configuration)
- ✅ `.gitignore` (excludes sensitive files)
- ✅ `server.js` (main application file)

## 🌐 Step 2: Deploy to Render

### 2.1 Create New Web Service
1. Go to [render.com](https://render.com) and sign in
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select your `mandap-backend` repository

### 2.2 Configure Service Settings
```
Name: mandap-backend
Environment: Node
Region: Oregon (US West)
Branch: main
Root Directory: (leave empty)
Build Command: npm install
Start Command: npm start
```

### 2.3 Environment Variables
Add these environment variables in Render dashboard:

#### Required Variables:
```
NODE_ENV = production
PORT = 10000
MONGO_URI = mongodb+srv://rahulwaghole14_db_user:toE4TwZVJvHHAW2j@mandap.sdrnrmf.mongodb.net/?retryWrites=true&w=majority
JWT_SECRET = your-super-secret-jwt-key-change-in-production-12345
JWT_EXPIRE = 24h
UPLOAD_PATH = ./uploads
MAX_FILE_SIZE = 5242880
RATE_LIMIT_WINDOW_MS = 900000
RATE_LIMIT_MAX_REQUESTS = 100
```

#### Optional Variables (if needed):
```
SMTP_HOST = smtp.gmail.com
SMTP_PORT = 587
SMTP_USER = your-email@gmail.com
SMTP_PASS = your-app-password
TWILIO_ACCOUNT_SID = your-twilio-account-sid
TWILIO_AUTH_TOKEN = your-twilio-auth-token
TWILIO_PHONE_NUMBER = +1234567890
```

### 2.4 Deploy
1. Click **"Create Web Service"**
2. Render will automatically build and deploy your application
3. Wait for deployment to complete (usually 2-5 minutes)

## 🔍 Step 3: Verify Deployment

### 3.1 Check Health Endpoint
Visit: `https://your-app-name.onrender.com/health`

Expected response:
```json
{
  "status": "OK",
  "message": "Server is running",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "production"
}
```

### 3.2 Test API Endpoints
```bash
# Test mobile API
curl https://your-app-name.onrender.com/api/mobile/associations

# Test birthdays API
curl https://your-app-name.onrender.com/api/mobile/birthdays/today
```

## 📱 Step 4: Update Mobile App Configuration

### 4.1 Update API Base URL
In your React Native app, update the API base URL:

```javascript
// In your API service file
const API_BASE_URL = 'https://your-app-name.onrender.com/api';
```

### 4.2 Update CORS (if needed)
The server already includes CORS configuration, but verify it includes your mobile app's domain.

## 🔧 Step 5: Production Optimizations

### 5.1 Environment Variables Security
- ✅ Never commit `.env` files to Git
- ✅ Use Render's environment variables for sensitive data
- ✅ Generate a strong JWT_SECRET for production

### 5.2 Database Connection
- ✅ MongoDB Atlas is already configured
- ✅ Connection string is secure and production-ready

### 5.3 File Uploads
- ⚠️ **Important**: Render's free tier has ephemeral storage
- 📁 Files uploaded to `./uploads` will be lost on restart
- 🔄 Consider using AWS S3 for production file storage

## 🚨 Troubleshooting

### Common Issues:

#### 1. Build Failures
```bash
# Check build logs in Render dashboard
# Common fixes:
npm install --production
```

#### 2. Environment Variables
- Verify all required environment variables are set
- Check variable names match exactly (case-sensitive)

#### 3. Database Connection
- Verify MongoDB Atlas connection string
- Check network access settings in MongoDB Atlas

#### 4. CORS Issues
- Update CORS origins in `server.js`
- Add your mobile app's domain to allowed origins

### Debug Commands:
```bash
# Check if server starts locally
npm start

# Test environment variables
node -e "console.log(process.env.MONGO_URI)"
```

## 📊 Monitoring & Maintenance

### 1. Render Dashboard
- Monitor service health
- Check deployment logs
- View resource usage

### 2. MongoDB Atlas
- Monitor database performance
- Check connection metrics
- Review query performance

### 3. Application Logs
- Access logs via Render dashboard
- Monitor error rates
- Track API usage

## 🔄 Continuous Deployment

### Automatic Deployments
- Render automatically deploys when you push to main branch
- Each deployment gets a unique URL
- Previous deployments are kept for rollback

### Manual Deployments
- Use Render dashboard to trigger manual deployments
- Deploy specific commits or branches
- Rollback to previous versions if needed

## 📈 Scaling Considerations

### Free Tier Limitations:
- ⏰ Services sleep after 15 minutes of inactivity
- 🔄 Cold starts may take 30-60 seconds
- 💾 Ephemeral storage (files lost on restart)
- 📊 Limited resource allocation

### Upgrade Options:
- **Starter Plan**: $7/month - Always-on service
- **Standard Plan**: $25/month - Better performance
- **Pro Plan**: $85/month - High availability

## 🎯 Next Steps

1. ✅ Deploy to Render
2. ✅ Test all API endpoints
3. ✅ Update mobile app configuration
4. ✅ Monitor application performance
5. 🔄 Consider file storage solution (AWS S3)
6. 🔄 Set up monitoring and alerts
7. 🔄 Configure custom domain (optional)

## 📞 Support

- **Render Documentation**: [render.com/docs](https://render.com/docs)
- **Render Support**: Available in dashboard
- **MongoDB Atlas Support**: [cloud.mongodb.com](https://cloud.mongodb.com)

---

**🎉 Congratulations!** Your Mandap backend is now deployed to production on Render!
