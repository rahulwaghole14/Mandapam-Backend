# 🔧 Razorpay Payment Troubleshooting Guide

## Common Error: "Something went wrong" in Razorpay Checkout

This error typically occurs when there's a mismatch between the order and the Razorpay account/key being used.

---

## ✅ What's Fixed in the Backend

### 1. **Enhanced Payment Options Response**
The `/api/mobile/events/:id/register-payment` endpoint now returns:
- Pre-filled member information (name, email, phone)
- Proper event title and description
- All required Razorpay options

### 2. **Improved Error Handling**
- Better logging for Razorpay errors
- Validation of key formats
- Clearer error messages

---

## 🔍 Troubleshooting Steps

### Step 1: Verify Razorpay Keys in Production

1. **Check Render Environment Variables**:
   - Go to Render Dashboard → Your Service → Environment
   - Verify `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` are set
   - Ensure they match your Razorpay account

2. **Test Keys Match**:
   - Both keys must be from the same account
   - Both must be test keys OR both live keys (not mixed)

### Step 2: Check Order Creation

The order should be created successfully before showing Razorpay checkout.

**Verify the API Response**:
```json
{
  "success": true,
  "order": {
    "id": "order_RamtONiHbf6jBR",
    "amount": 50000,
    "status": "created"
  },
  "keyId": "rzp_test_RQ5ITAzm7AyNN9",
  "paymentOptions": {
    "key": "rzp_test_RQ5ITAzm7AyNN9",
    "order_id": "order_RamtONiHbf6jBR",
    "amount": 50000,
    ...
  }
}
```

**Important**: 
- `order.id` from backend response should match `order_id` in payment options
- `keyId` should match the key in `paymentOptions.key`
- Amount should match (in paise, e.g., 50000 = ₹500)

### Step 3: Frontend Implementation

**Use the `paymentOptions` from API response**:

```javascript
// ✅ CORRECT: Use paymentOptions from API
const response = await fetch('/api/mobile/events/30/register-payment', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();

// Add handler functions on frontend
const options = {
  ...data.paymentOptions,
  handler: function(response) {
    // Handle success
    console.log('Payment success:', response);
  },
  modal: {
    ondismiss: function() {
      // Handle cancellation
      console.log('Payment cancelled');
    }
  }
};

// Initialize Razorpay Checkout
const razorpay = new Razorpay(options);
razorpay.open();
```

**❌ COMMON MISTAKES**:

1. **Using Wrong Key**:
```javascript
// ❌ WRONG: Hardcoding key or using different key
const options = {
  key: "rzp_test_SOMETHING_ELSE", // Wrong key!
  order_id: data.order.id,
  ...
};
```

2. **Mismatched Order ID**:
```javascript
// ❌ WRONG: Using different order ID
const options = {
  key: data.keyId,
  order_id: "order_DIFFERENT_ID", // Wrong order!
  ...
};
```

3. **Amount Mismatch**:
```javascript
// ❌ WRONG: Changing amount or currency
const options = {
  ...data.paymentOptions,
  amount: 30000, // Changed from 50000 - will fail!
};
```

---

## 🔐 Account Verification

### Check Order in Razorpay Dashboard

1. Log in to https://dashboard.razorpay.com
2. Go to **Orders** section
3. Search for the order ID from your API response
4. Verify:
   - Order exists
   - Order status is "created"
   - Order amount matches
   - Order is in the same account as your keys

### Common Issues

**Issue**: Order not found in dashboard
- **Cause**: Order created with different account/keys
- **Solution**: Verify environment variables match Razorpay account

**Issue**: "Authentication failed" error
- **Cause**: Key ID and Secret don't match
- **Solution**: Regenerate keys from Razorpay dashboard and update environment variables

**Issue**: "Something went wrong" when opening checkout
- **Cause**: Order ID mismatch or wrong key
- **Solution**: Ensure using `paymentOptions` directly from API response

---

## 📝 Updated API Response Format

### POST `/api/mobile/events/:id/register-payment`

**Response (201)**:
```json
{
  "success": true,
  "isFree": false,
  "order": {
    "id": "order_RamtONiHbf6jBR",
    "entity": "order",
    "amount": 50000,
    "amount_paid": 0,
    "amount_due": 50000,
    "currency": "INR",
    "receipt": "evt_30_mem_15_1698765432123",
    "status": "created",
    "created_at": 1698765432
  },
  "keyId": "rzp_test_RQ5ITAzm7AyNN9",
  "paymentOptions": {
    "key": "rzp_test_RQ5ITAzm7AyNN9",
    "amount": 50000,
    "currency": "INR",
    "name": "Event Registration",
    "description": "Event Registration Fee - Event Name",
    "order_id": "order_RamtONiHbf6jBR",
    "prefill": {
      "name": "John Doe",
      "email": "john@example.com",
      "contact": "9876543210"
    },
    "theme": {
      "color": "#2563eb"
    },
    "notes": {
      "eventId": "30",
      "memberId": "15",
      "eventName": "Event Name"
    }
  }
}
```

**Use `paymentOptions** directly - it's pre-configured with all correct values!

---

## ✅ Quick Fix Checklist

- [ ] Verify Razorpay keys are set in Render environment variables
- [ ] Keys are from the same Razorpay account (both test or both live)
- [ ] Server has been restarted after adding keys
- [ ] Using `paymentOptions` directly from API response (don't modify key/order_id/amount)
- [ ] Order exists in Razorpay dashboard
- [ ] Order status is "created" (not paid/cancelled)
- [ ] Member information is being pre-filled correctly

---

## 🐛 Debug Steps

1. **Check Server Logs**:
   Look for errors when creating order:
   ```
   Razorpay order creation failed: { ... }
   ```

2. **Verify Order Creation**:
   Test the endpoint with Postman/cURL and check if order is created

3. **Check Frontend Console**:
   Look for JavaScript errors or network failures

4. **Verify Payment Options**:
   Log `paymentOptions` before passing to Razorpay:
   ```javascript
   console.log('Payment options:', JSON.stringify(options, null, 2));
   ```

---

## 📞 Support

If the issue persists:
1. Check Razorpay dashboard for any account issues
2. Verify all environment variables are correct
3. Test with a fresh order (create new one)
4. Contact backend team with:
   - Order ID from API response
   - Error message from Razorpay
   - Server logs (if available)

---

**Last Updated**: January 30, 2025

