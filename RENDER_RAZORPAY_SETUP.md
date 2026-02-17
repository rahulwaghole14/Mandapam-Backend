# 🔧 Setting Up Razorpay in Render Production

## Problem
Getting error: `"Payment gateway is not configured. Please contact administrator."` when calling payment endpoints on production.

## Solution
Add Razorpay environment variables in your Render dashboard.

## 📋 Steps to Add Razorpay Keys in Render

### 1. **Go to Render Dashboard**
   - Visit: https://dashboard.render.com
   - Sign in to your account

### 2. **Navigate to Your Web Service**
   - Click on your `mandap-backend` service (or whatever you named it)

### 3. **Go to Environment Tab**
   - In the left sidebar, click on **"Environment"**

### 4. **Add Environment Variables**
   Click **"Add Environment Variable"** and add these three variables:

   ```
   Key: RAZORPAY_KEY_ID
   Value: rzp_test_RQ5ITAzm7AyNN9
   ```

   ```
   Key: RAZORPAY_KEY_SECRET
   Value: USvxQvbw66SkkyFLVuUq0JLw
   ```

   ```
   Key: QR_SECRET
   Value: [any-random-secret-string-for-qr-token-signing]
   ```
   
   **Example QR_SECRET**: `my-super-secret-qr-key-2024-production`

### 5. **Save and Restart**
   - Click **"Save Changes"** at the bottom
   - Render will automatically restart your service with the new environment variables
   - Wait 1-2 minutes for the restart to complete

### 6. **Verify**
   - After restart, try the payment endpoint again
   - The error should be gone and payment orders should be created successfully

## 🔐 For Production (Live Keys)

When you're ready to go live with real payments:

1. Log in to Razorpay Dashboard: https://dashboard.razorpay.com
2. Go to **Settings** → **API Keys**
3. Generate **Live Keys** (not test keys)
4. Replace the test keys in Render with your live keys:
   - `RAZORPAY_KEY_ID` = Your live key ID (starts with `rzp_live_...`)
   - `RAZORPAY_KEY_SECRET` = Your live key secret

## ⚠️ Security Notes

- Never commit Razorpay keys to Git
- Test keys are safe to use in development/staging
- Live keys should only be used in production
- Keep your keys secure and rotate them if compromised

## ✅ Quick Checklist

- [ ] Added `RAZORPAY_KEY_ID` in Render
- [ ] Added `RAZORPAY_KEY_SECRET` in Render  
- [ ] Added `QR_SECRET` in Render
- [ ] Service restarted automatically
- [ ] Payment endpoint tested and working

