# Payment Integration - Quick Start Guide

## 🚀 Setup (5 minutes)

### 1. Get PayPal Credentials

```bash
# Go to: https://developer.paypal.com
# Create a REST API app (Sandbox)
# Copy Client ID and Secret
```

### 2. Configure Environment Variables

```bash
# In your .env file
PAYPAL_CLIENT_ID="your_sandbox_client_id"
PAYPAL_SECRET="your_sandbox_secret"
PAYPAL_MODE="sandbox"
NEXT_PUBLIC_PAYPAL_CLIENT_ID="your_sandbox_client_id"
```

### 3. Set Up Webhook (for local testing)

```bash
# Install ngrok
npm install -g ngrok

# Start your app
npm run dev

# In another terminal
ngrok http 3000

# Copy the ngrok URL (e.g., https://abc123.ngrok.io)
```

### 4. Create PayPal Webhook

```bash
# Go to: https://developer.paypal.com/dashboard/webhooks
# Click "Create Webhook"
# URL: https://abc123.ngrok.io/api/webhooks/paypal
# Event: PAYMENT.CAPTURE.COMPLETED
# Copy Webhook ID
```

```bash
# Add to .env
PAYPAL_WEBHOOK_ID="your_webhook_id"
```

### 5. Initialize Database

```bash
npm run db:push
```

## ✅ Test Payment Flow

### Create a Test Campaign

```sql
-- In Prisma Studio (npm run db:studio) or your database client
INSERT INTO campaigns (
  id, user_id, slug, title, sport, fundraising_goal,
  grid_rows, grid_cols, status
) VALUES (
  gen_random_uuid(),
  'your_user_id',
  'test-campaign',
  'Test Campaign',
  'football',
  1000,
  10,
  10,
  'active'
);
```

### Initialize Grid Squares

```typescript
// In your app or via API
import { initializeGrid } from '@/services/gridService'

await initializeGrid(
  'campaign-id',
  10, // rows
  10, // cols
  5   // $5 per square
)
```

### Test the Flow

1. **Navigate to campaign page:**
   ```
   http://localhost:3000/give/test-campaign
   ```

2. **Select squares** on the grid

3. **Click "Donate"** button

4. **Fill in donor info:**
   - Name: Test Donor
   - Email: test@example.com

5. **Click PayPal button**

6. **Log in with sandbox account:**
   - Go to PayPal Developer > Sandbox > Accounts
   - Use a test Personal account
   - Or create new test account

7. **Complete payment**

8. **Verify success:**
   - Grid updates with donor name
   - Transaction status: completed
   - Email sent (if configured)

## 🧪 PayPal Sandbox Test Accounts

### Create Test Accounts

```bash
# Go to: https://developer.paypal.com/dashboard/accounts
# Click "Create Account"
# Account Type: Personal (Buyer)
# Country: United States
# Note the email and password
```

### Test Credit Cards

PayPal Sandbox accepts these test cards:

**Visa:**
- Number: 4032039610898056
- Exp: Any future date
- CVV: Any 3 digits

**Mastercard:**
- Number: 5425233430109903
- Exp: Any future date
- CVV: Any 3 digits

## 🔍 Verify Webhook Received

### Check Webhook Events Table

```sql
SELECT event_id, event_type, status, processed_at, error_message
FROM webhook_events
ORDER BY created_at DESC
LIMIT 10;
```

### Check PayPal Dashboard

```bash
# Go to: https://developer.paypal.com/dashboard/webhooks
# Click on your webhook
# View "Recent deliveries"
# Should show 200 OK responses
```

## 🐛 Troubleshooting

### Webhook Not Received

**Check ngrok:**
```bash
# Visit ngrok dashboard
http://localhost:4040

# View requests
# Should see POST to /api/webhooks/paypal
```

**Check webhook signature:**
```typescript
// In webhook handler, temporarily disable verification
// const isValid = await verifyWebhookSignature(headers, body)
const isValid = true // TEMP: For testing only
```

### Squares Not Unlocking

**Run manual cleanup:**
```sql
UPDATE grid_squares
SET status = 'available', locked_until = NULL
WHERE status = 'pending' AND locked_until < NOW();
```

### Transaction Stuck in "pending"

**Check webhook delivery:**
- PayPal Dashboard > Webhooks > Recent Deliveries
- Look for failed deliveries
- Retry manually

**Check transaction:**
```sql
SELECT id, paypal_order_id, status, failure_reason
FROM transactions
WHERE status = 'pending'
ORDER BY created_at DESC;
```

## 📝 API Endpoints Summary

### Lock Squares
```bash
POST /api/campaigns/:slug/grid/lock
Body: { squareIds: ["id1", "id2"] }
Returns: { lockToken, lockedSquares, totalAmount }
```

### Create Order
```bash
POST /api/payments/create-order
Body: { lockToken, donorEmail, donorName }
Returns: { orderId, approvalUrl }
```

### Capture Order
```bash
POST /api/payments/capture-order
Body: { orderId }
Returns: { transactionId, status }
```

### Payment Status
```bash
GET /api/payments/status/:transactionId
Returns: { status, amount, donorName }
```

### Unlock Squares
```bash
POST /api/campaigns/:slug/grid/unlock
Body: { lockToken }
Returns: { success: true }
```

### Webhook Handler
```bash
POST /api/webhooks/paypal
Headers: PayPal signature headers
Body: PayPal webhook event
Returns: { success: true }
```

## 🎯 Common Test Scenarios

### Scenario 1: Successful Payment ✅
1. Select squares → Lock → Enter info → Pay → Success
2. Verify: Squares marked as sold, donor name visible

### Scenario 2: Payment Cancelled 🚫
1. Select squares → Lock → Enter info → Cancel payment
2. Verify: Squares unlocked, available for others

### Scenario 3: Concurrent Purchase 🏁
1. Open campaign in two browsers
2. Both select SAME square
3. Browser 1 completes payment
4. Browser 2 tries to complete
5. Verify: Browser 2 gets error, only one purchase recorded

### Scenario 4: Lock Expiration ⏰
1. Select squares (locks for 5 min)
2. Wait 5+ minutes without paying
3. Verify: Squares auto-unlocked, available again

## 🚀 Going to Production

### 1. Get Production Credentials
```bash
# PayPal Dashboard > Apps & Credentials > Live
# Copy Live Client ID and Secret
```

### 2. Update Environment
```bash
PAYPAL_CLIENT_ID="live_client_id"
PAYPAL_SECRET="live_secret"
PAYPAL_MODE="production"
NEXT_PUBLIC_PAYPAL_CLIENT_ID="live_client_id"
```

### 3. Update Webhook URL
```bash
# Point to production domain
# https://gridgive.com/api/webhooks/paypal
# Get new PAYPAL_WEBHOOK_ID
```

### 4. Test with $1 Donation
- Use your own PayPal account
- Make real $1 donation
- Verify entire flow works

### 5. Monitor for 24 Hours
- Check webhook success rate
- Watch error logs
- Verify emails sent

## 📞 Support

**PayPal Developer Support:**
- https://developer.paypal.com/support/

**Community Forum:**
- https://www.paypal-community.com/

**GridGive Issues:**
- Check PAYMENT_INTEGRATION.md for detailed docs
- Review webhook logs
- Test in sandbox first

---

**Ready to test?** Follow the steps above and you'll have payments working in minutes!
