# 🚨 Razorpay Payment Quick Fix - Frontend

## ⚠️ Critical Issue Found

Your frontend is using a **hardcoded Razorpay key** that doesn't match the API response:

**Frontend is using**: `rzp_test_RQ5ITAzm7AyNN9`  
**API returned**: `rzp_test_Ra3J6zwa2q6KN4`  

**This mismatch causes "Something went wrong" errors!**

---

## ✅ Immediate Fix

### 1. Use Key from API Response

**❌ DON'T DO THIS (Current Code)**:
```javascript
const options = {
  key: "rzp_test_RQ5ITAzm7AyNN9", // Hardcoded - WRONG!
  order_id: data.order.id,
  amount: data.order.amount,
  ...
};
```

**✅ DO THIS Instead**:
```javascript
const response = await fetch('/api/mobile/events/31/register-payment', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();

// Use keyId from API response
const options = {
  key: data.keyId, // ✅ Use from API response
  order_id: data.order.id,
  amount: data.order.amount,
  currency: 'INR',
  name: event.title || 'Event Registration',
  description: `Event Registration Fee - ${event.title || 'Event'}`,
  prefill: {
    name: '', // Will be filled by backend after deployment
    email: '',
    contact: ''
  },
  theme: {
    color: '#2563eb'
  }
};
```

---

## 🎯 Better Solution (After Backend Deployment)

Once the backend is deployed with the latest changes, the API will return `paymentOptions`. Use it directly:

```javascript
const response = await fetch('/api/mobile/events/31/register-payment', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const data = await response.json();

// ✅ Use paymentOptions directly from API (after deployment)
if (data.paymentOptions) {
  const options = {
    ...data.paymentOptions,
    handler: function(response) {
      // Handle payment success
      console.log('Payment success:', response);
      // Call confirm-payment endpoint
    },
    modal: {
      ondismiss: function() {
        // Handle payment cancellation
        console.log('Payment cancelled');
      }
    }
  };
  
  const razorpay = new Razorpay(options);
  razorpay.open();
} else {
  // Fallback: construct manually (current deployment)
  const options = {
    key: data.keyId, // ✅ Always use from API
    order_id: data.order.id,
    amount: data.order.amount,
    currency: 'INR',
    name: event.title || 'Event Registration',
    description: `Event Registration Fee - ${event.title || 'Event'}`,
    prefill: {
      name: '',
      email: '',
      contact: ''
    },
    theme: {
      color: '#2563eb'
    },
    handler: function(response) {
      // Handle payment success
    },
    modal: {
      ondismiss: function() {
        // Handle cancellation
      }
    }
  };
  
  const razorpay = new Razorpay(options);
  razorpay.open();
}
```

---

## 🔍 Verify Your Fix

After updating the code, check these in your logs:

1. **Key matches**:
   ```
   API keyId: rzp_test_Ra3J6zwa2q6KN4
   Payment options key: rzp_test_Ra3J6zwa2q6KN4  ✅ Should match!
   ```

2. **Order ID matches**:
   ```
   API order.id: order_RanNPzFWlQPcv3
   Payment options order_id: order_RanNPzFWlQPcv3  ✅ Should match!
   ```

3. **Amount matches**:
   ```
   API order.amount: 50000
   Payment options amount: 50000  ✅ Should match!
   ```

---

## 📝 Current API Response (Before Deployment)

```json
{
  "success": true,
  "isFree": false,
  "order": {
    "id": "order_RanNPzFWlQPcv3",
    "amount": 50000,
    "currency": "INR",
    "status": "created"
  },
  "keyId": "rzp_test_Ra3J6zwa2q6KN4"
}
```

**Use `keyId` and `order.id` from this response!**

---

## 📝 Future API Response (After Deployment)

```json
{
  "success": true,
  "isFree": false,
  "order": {
    "id": "order_RanNPzFWlQPcv3",
    "amount": 50000,
    "currency": "INR",
    "status": "created"
  },
  "keyId": "rzp_test_Ra3J6zwa2q6KN4",
  "paymentOptions": {
    "key": "rzp_test_Ra3J6zwa2q6KN4",
    "order_id": "order_RanNPzFWlQPcv3",
    "amount": 50000,
    "currency": "INR",
    "name": "payment test 1",
    "description": "Event Registration Fee - payment test 1",
    "prefill": {
      "name": "rahul waghole",
      "email": "member@example.com",
      "contact": "9881976526"
    },
    "theme": {
      "color": "#2563eb"
    }
  }
}
```

**After deployment, just use `data.paymentOptions` directly!**

---

## ✅ Quick Checklist

- [ ] Remove hardcoded Razorpay key
- [ ] Use `data.keyId` from API response
- [ ] Use `data.order.id` for `order_id`
- [ ] Use `data.order.amount` for `amount`
- [ ] Verify all values match before opening Razorpay
- [ ] Test payment flow after fix

---

**After backend deployment**: The API will include `paymentOptions` with pre-filled member data. Just spread it into your Razorpay options!

---

**Priority**: 🔴 **HIGH** - This fix will resolve the "Something went wrong" error immediately!

