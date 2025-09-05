# ✅ Render Deployment Checklist

## 📋 Pre-Deployment Checklist

### 1. Code Preparation
- [x] All code committed to Git
- [x] `package.json` updated with build scripts
- [x] `render.yaml` configuration file created
- [x] `.gitignore` file updated
- [x] CORS configuration updated for production
- [x] Environment variables documented

### 2. Repository Setup
- [ ] Push all changes to GitHub
- [ ] Verify repository is public or connected to Render
- [ ] Check that all required files are in the repository

### 3. Environment Variables
- [ ] MongoDB Atlas connection string ready
- [ ] JWT secret key generated for production
- [ ] All required environment variables documented

## 🚀 Deployment Steps

### Step 1: GitHub Repository
```bash
# Commit all changes
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

### Step 2: Render Setup
1. [ ] Go to [render.com](https://render.com)
2. [ ] Sign up/Login to Render
3. [ ] Click "New +" → "Web Service"
4. [ ] Connect GitHub repository
5. [ ] Select `mandap-backend` repository

### Step 3: Service Configuration
- [ ] **Name**: `mandap-backend`
- [ ] **Environment**: `Node`
- [ ] **Region**: `Oregon (US West)`
- [ ] **Branch**: `main`
- [ ] **Root Directory**: (leave empty)
- [ ] **Build Command**: `npm install`
- [ ] **Start Command**: `npm start`

### Step 4: Environment Variables
Add these in Render dashboard:

#### Required Variables:
- [ ] `NODE_ENV` = `production`
- [ ] `PORT` = `10000`
- [ ] `MONGO_URI` = `mongodb+srv://rahulwaghole14_db_user:toE4TwZVJvHHAW2j@mandap.sdrnrmf.mongodb.net/?retryWrites=true&w=majority`
- [ ] `JWT_SECRET` = `your-super-secret-jwt-key-change-in-production-12345`
- [ ] `JWT_EXPIRE` = `24h`
- [ ] `UPLOAD_PATH` = `./uploads`
- [ ] `MAX_FILE_SIZE` = `5242880`
- [ ] `RATE_LIMIT_WINDOW_MS` = `900000`
- [ ] `RATE_LIMIT_MAX_REQUESTS` = `100`

#### Optional Variables (if needed):
- [ ] `SMTP_HOST` = `smtp.gmail.com`
- [ ] `SMTP_PORT` = `587`
- [ ] `SMTP_USER` = `your-email@gmail.com`
- [ ] `SMTP_PASS` = `your-app-password`
- [ ] `TWILIO_ACCOUNT_SID` = `your-twilio-account-sid`
- [ ] `TWILIO_AUTH_TOKEN` = `your-twilio-auth-token`
- [ ] `TWILIO_PHONE_NUMBER` = `+1234567890`

### Step 5: Deploy
- [ ] Click "Create Web Service"
- [ ] Wait for deployment to complete (2-5 minutes)
- [ ] Note the deployment URL

## 🧪 Post-Deployment Testing

### Health Check
- [ ] Visit: `https://your-app-name.onrender.com/health`
- [ ] Verify response: `{"status":"OK","message":"Server is running"}`

### API Endpoints Testing
- [ ] Test associations: `GET /api/mobile/associations`
- [ ] Test today's birthdays: `GET /api/mobile/birthdays/today`
- [ ] Test upcoming birthdays: `GET /api/mobile/birthdays/upcoming`
- [ ] Test member registration: `POST /api/mobile/register`

### Mobile App Configuration
- [ ] Update API base URL in mobile app
- [ ] Test mobile app with new backend URL
- [ ] Verify all features work correctly

## 🔧 Troubleshooting

### Common Issues:
- [ ] **Build Failures**: Check build logs in Render dashboard
- [ ] **Environment Variables**: Verify all required variables are set
- [ ] **Database Connection**: Check MongoDB Atlas connection
- [ ] **CORS Issues**: Update CORS configuration if needed

### Debug Steps:
1. Check Render deployment logs
2. Verify environment variables
3. Test database connection
4. Check CORS configuration

## 📱 Mobile App Updates

### API Configuration
```javascript
// Update in your mobile app
const API_BASE_URL = 'https://your-app-name.onrender.com/api';
```

### CORS Updates
If you deploy a web frontend, add its URL to CORS origins in `server.js`:
```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001', 
  'http://localhost:8082',
  'http://localhost:8081',
  'https://your-frontend-app.onrender.com' // Add this
];
```

## 🎯 Final Verification

- [ ] All API endpoints responding correctly
- [ ] Mobile app connecting to deployed backend
- [ ] Database operations working
- [ ] File uploads working (if applicable)
- [ ] Authentication working
- [ ] Birthdays API working
- [ ] No CORS errors
- [ ] Performance acceptable

## 📊 Monitoring Setup

- [ ] Monitor Render dashboard for service health
- [ ] Set up MongoDB Atlas monitoring
- [ ] Check application logs regularly
- [ ] Monitor API response times

---

**🎉 Deployment Complete!** Your Mandap backend is now live on Render!
