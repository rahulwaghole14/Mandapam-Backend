# Troubleshooting: 502 Bad Gateway & CORS Errors

## Issue Description

**Error**: `502 (Bad Gateway)` when accessing `/api/public/events/33`  
**CORS Error**: `No 'Access-Control-Allow-Origin' header is present`

## Root Cause Analysis

A **502 Bad Gateway** error means:
- The server is not responding properly
- The server might be crashing on startup
- There might be a runtime error preventing the server from handling requests

## Solutions Applied

### 1. ✅ CORS Configuration Updated

**Changes Made:**
- Added `https://mandap-web-frontend-new.onrender.com` to allowed origins
- Made CORS more permissive for any `.onrender.com`, `.vercel.app`, or `.netlify.app` domain
- Added better logging for CORS debugging

**Status**: ✅ Committed and pushed (`e62b8e7`)

### 2. 🔍 Check Render Deployment Status

**Steps to Check:**

1. **Go to Render Dashboard**: https://dashboard.render.com
2. **Check Deployment Status**:
   - Look for your backend service
   - Check if deployment is still in progress
   - Check if deployment failed
   - Look for error messages in logs

3. **Check Build Logs**:
   - Look for any errors during build
   - Check if all dependencies installed correctly
   - Verify Node.js version matches

4. **Check Runtime Logs**:
   - Look for any startup errors
   - Check for database connection errors
   - Look for missing environment variables

### 3. 🔧 Common Causes of 502 Errors

#### A. Server Crashing on Startup

**Check for:**
- Missing environment variables
- Database connection failures
- Port conflicts
- Syntax errors in code

**How to Check:**
1. Go to Render Dashboard → Your Service → Logs
2. Look for error messages at startup
3. Check if server is listening on correct port

#### B. Database Connection Issues

**Check:**
- `DATABASE_URL` environment variable is set correctly
- Database is accessible from Render
- Database connection string format is correct

#### C. Missing Environment Variables

**Required Variables:**
- `DATABASE_URL`
- `JWT_SECRET`
- `RAZORPAY_KEY_ID` (if using payments)
- `RAZORPAY_KEY_SECRET` (if using payments)
- `QR_SECRET` (if using QR codes)

**Check in Render Dashboard:**
- Environment → Verify all variables are set

#### D. Port Configuration

**Check:**
- Render sets `PORT` environment variable automatically
- Server should listen on `process.env.PORT || 5000`
- Verify in `server.js`:

```javascript
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 4. 🧪 Test Server Health

**Test Endpoints:**

1. **Health Check**:
   ```bash
   curl https://mandapam-backend-97mi.onrender.com/api/health
   ```

2. **CORS Test**:
   ```bash
   curl https://mandapam-backend-97mi.onrender.com/cors-test
   ```

3. **Public Event Endpoint**:
   ```bash
   curl https://mandapam-backend-97mi.onrender.com/api/public/events/33
   ```

### 5. 🔄 Manual Restart

If deployment is stuck:

1. **In Render Dashboard**:
   - Go to your service
   - Click "Manual Deploy"
   - Select "Deploy latest commit"
   - Wait for deployment to complete

2. **Check Logs**:
   - Watch logs during deployment
   - Look for any errors
   - Verify server starts successfully

### 6. 📋 Server Startup Checklist

Verify these in Render logs:

- [ ] ✅ Server starts without errors
- [ ] ✅ Database connection successful
- [ ] ✅ All environment variables loaded
- [ ] ✅ Server listening on correct port
- [ ] ✅ Routes registered successfully
- [ ] ✅ No unhandled promise rejections

### 7. 🐛 Debugging Steps

**Step 1: Check Render Logs**
```bash
# In Render Dashboard → Your Service → Logs
# Look for:
- "Server running on port..."
- "PostgreSQL connection successful"
- Any error messages
```

**Step 2: Test Basic Endpoints**
```bash
# Test health endpoint
curl https://mandapam-backend-97mi.onrender.com/api/health

# Test CORS
curl -H "Origin: https://mandap-web-frontend-new.onrender.com" \
     https://mandapam-backend-97mi.onrender.com/api/health
```

**Step 3: Check CORS Headers**
```bash
# Test preflight request
curl -X OPTIONS \
  -H "Origin: https://mandap-web-frontend-new.onrender.com" \
  -H "Access-Control-Request-Method: GET" \
  -v \
  https://mandapam-backend-97mi.onrender.com/api/public/events/33
```

**Step 4: Verify Environment Variables**
In Render Dashboard → Environment:
- [ ] `DATABASE_URL` is set
- [ ] `JWT_SECRET` is set
- [ ] `NODE_ENV` is set (optional, but recommended)
- [ ] All other required variables are set

## Expected Behavior After Fix

Once the server is running correctly:

1. **CORS Headers Should Include**:
   ```
   Access-Control-Allow-Origin: https://mandap-web-frontend-new.onrender.com
   Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
   Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin
   ```

2. **Response Should Include**:
   - Proper CORS headers
   - Status code 200 (not 502)
   - JSON response with event data

## Next Steps

1. ✅ **Wait for Render Deployment** (2-5 minutes)
2. ✅ **Check Render Logs** for any errors
3. ✅ **Test the endpoint** using curl or browser
4. ✅ **If still 502**, check logs for specific error messages
5. ✅ **Contact support** if issue persists

## Additional Notes

- The CORS configuration now allows any `.onrender.com` domain automatically
- Better logging has been added to help debug CORS issues
- Check Render logs immediately after deployment for any startup errors

---

**Last Updated**: After fixing CORS configuration  
**Commit**: `e62b8e7` - Made CORS more permissive for Render/Vercel/Netlify domains

