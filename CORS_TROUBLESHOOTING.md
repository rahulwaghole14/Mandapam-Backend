# 🔧 CORS Troubleshooting Guide

## 🚨 **Common CORS Issues & Solutions**

### **1. Frontend App CORS Errors**

**Error Message:**
```
Access to fetch at 'http://localhost:5000/api/mobile/send-otp' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solutions:**

#### **Option A: Update Your Frontend API Base URL**
```javascript
// In your frontend app, update the API base URL
const API_BASE_URL = 'https://mandapam-backend-97mi.onrender.com';

// Example API call
fetch(`${API_BASE_URL}/api/mobile/send-otp`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    mobileNumber: '9876543210'
  })
});
```

#### **Option B: Add Your Frontend Port to CORS**
If you want to use localhost backend, add your frontend port to the allowed origins in `server.js`:

```javascript
const allowedOrigins = [
  'http://localhost:3000',  // React default
  'http://localhost:3001',  // Alternative React port
  'http://localhost:8080',  // Vue.js default
  'http://localhost:8081',  // Alternative port
  'http://localhost:8082',  // Your specific port
  'http://localhost:5173',  // Vite default
  'http://localhost:4200',  // Angular default
  // Add your specific port here
  'http://localhost:YOUR_PORT'
];
```

### **2. Test CORS Configuration**

#### **Test Script:**
```javascript
// Test CORS from browser console
fetch('https://mandapam-backend-97mi.onrender.com/api/health')
  .then(response => response.json())
  .then(data => console.log('✅ CORS working:', data))
  .catch(error => console.error('❌ CORS error:', error));
```

#### **Test with curl:**
```bash
# Test preflight request
curl -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  https://mandapam-backend-97mi.onrender.com/api/mobile/send-otp

# Test actual request
curl -X POST \
  -H "Origin: http://localhost:3000" \
  -H "Content-Type: application/json" \
  -d '{"mobileNumber":"9876543210"}' \
  https://mandapam-backend-97mi.onrender.com/api/mobile/send-otp
```

### **3. Frontend Configuration Examples**

#### **React/Next.js:**
```javascript
// api.js
const API_BASE_URL = 'https://mandapam-backend-97mi.onrender.com';

export const sendOTP = async (mobileNumber) => {
  const response = await fetch(`${API_BASE_URL}/api/mobile/send-otp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mobileNumber }),
  });
  
  if (!response.ok) {
    throw new Error('Network response was not ok');
  }
  
  return response.json();
};
```

#### **Vue.js:**
```javascript
// api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'https://mandapam-backend-97mi.onrender.com',
  headers: {
    'Content-Type': 'application/json',
  },
});

export const sendOTP = (mobileNumber) => {
  return api.post('/api/mobile/send-otp', { mobileNumber });
};
```

#### **Angular:**
```typescript
// api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseURL = 'https://mandapam-backend-97mi.onrender.com';

  constructor(private http: HttpClient) { }

  sendOTP(mobileNumber: string) {
    return this.http.post(`${this.baseURL}/api/mobile/send-otp`, { mobileNumber });
  }
}
```

### **4. Environment Configuration**

#### **Development (.env.local):**
```env
REACT_APP_API_BASE_URL=https://mandapam-backend-97mi.onrender.com
# or for local development:
# REACT_APP_API_BASE_URL=http://localhost:5000
```

#### **Production:**
```env
REACT_APP_API_BASE_URL=https://mandapam-backend-97mi.onrender.com
```

### **5. Debugging Steps**

1. **Check Browser Console:**
   - Look for CORS error messages
   - Check the exact origin being blocked

2. **Check Backend Logs:**
   - Look for CORS request logs
   - Check which origins are being allowed/blocked

3. **Test with Postman/Insomnia:**
   - Test API endpoints directly
   - Verify backend is working

4. **Check Network Tab:**
   - Look for preflight OPTIONS requests
   - Check response headers

### **6. Common Frontend Ports**

Add these to your CORS allowed origins if needed:
- React: `http://localhost:3000`
- Vue.js: `http://localhost:8080`
- Angular: `http://localhost:4200`
- Vite: `http://localhost:5173`
- Next.js: `http://localhost:3000`
- Nuxt.js: `http://localhost:3000`

### **7. Quick Fix for Development**

If you're in development and want to allow all origins temporarily:

```javascript
// In server.js (NOT for production!)
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

## 🎯 **Recommended Solution**

**For your case, I recommend:**

1. **Use the deployed backend URL** in your frontend:
   ```javascript
   const API_BASE_URL = 'https://mandapam-backend-97mi.onrender.com';
   ```

2. **Update your frontend API calls** to use this URL

3. **Test the connection** with the test script above

This way you don't need to worry about CORS configuration and can use the production-ready backend that's already deployed!

## 🆘 **Still Having Issues?**

If you're still getting CORS errors:

1. **Tell me your frontend port** (e.g., 3000, 8080, etc.)
2. **Share the exact error message** from browser console
3. **Let me know your frontend framework** (React, Vue, Angular, etc.)

I'll help you fix it! 🚀
