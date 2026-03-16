# Payment Integration - Implementation Guide

## Overview

The payment integration is the most critical part of GridGive. It handles:
- Square locking with optimistic concurrency control
- PayPal order creation and capture
- Idempotent webhook processing
- Real-time grid updates after payment

## Architecture Flow

```
┌─────────────┐
│   Donor     │
│  Selects    │
│  Squares    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────────────┐
│ 1. Lock Squares (POST /api/campaigns/:slug/grid/lock)  │
│    - Optimistic locking with version check             │
│    - 5-minute lock expiration                          │
│    - Returns lockToken                                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Enter Donor Info (Frontend)                         │
│    - Name (displayed on grid)                          │
│    - Email (for receipt)                               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Create PayPal Order (POST /api/payments/create-order)│
│    - Verify lockToken                                   │
│    - Calculate total amount                             │
│    - Create transaction record (status: pending)        │
│    - Return PayPal orderId                              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 4. PayPal Checkout Modal (Frontend)                    │
│    - PayPal Smart Payment Buttons                      │
│    - Donor completes payment                           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Capture Order (POST /api/payments/capture-order)    │
│    - Capture payment via PayPal API                    │
│    - Update transaction (status: processing)           │
│    - Wait for webhook confirmation                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 6. Webhook Handler (POST /api/webhooks/paypal)         │
│    - Verify webhook signature                          │
│    - Check idempotency (webhook_events table)          │
│    - Update transaction (status: completed)            │
│    - Mark squares as sold                              │
│    - Invalidate caches                                 │
│    - Broadcast WebSocket event                         │
│    - Queue email notifications                         │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 7. Success (Frontend)                                   │
│    - Show confirmation                                  │
│    - Grid updates in real-time                         │
│    - Donor name appears on squares                     │
└─────────────────────────────────────────────────────────┘
```

## Critical Files

### 1. Lock Squares API
**File:** `src/app/api/campaigns/[slug]/grid/lock/route.ts`

**Purpose:** Lock squares before payment to prevent double-purchase

**Key Logic:**
- Validates square IDs
- Uses optimistic locking (version check)
- Stores lock info in Redis (5 min TTL)
- Returns lock token for payment flow

**Error Handling:**
- 409 Conflict: Squares already locked by another user
- 400 Bad Request: Campaign not active
- 404 Not Found: Campaign doesn't exist

### 2. Create Order API
**File:** `src/app/api/payments/create-order/route.ts`

**Purpose:** Create PayPal order with locked squares

**Key Logic:**
- Verifies lockToken validity
- Fetches locked squares from Redis
- Calculates total amount
- Calls PayPal API to create order
- Creates transaction record (status: pending)

**Security:**
- Lock token prevents tampering with amount
- Server calculates total (never trusts client)
- Campaign status check

### 3. Capture Order API
**File:** `src/app/api/payments/capture-order/route.ts`

**Purpose:** Capture payment after buyer approval

**Key Logic:**
- Calls PayPal API to capture funds
- Updates transaction to "processing"
- Webhook will finalize to "completed"

**Note:** This is a quick response to the client. The webhook does the heavy lifting.

### 4. Webhook Handler (MOST CRITICAL)
**File:** `src/app/api/webhooks/paypal/route.ts`

**Purpose:** Finalize payment and update grid state

**Key Logic:**
- Verifies PayPal webhook signature (security)
- Checks `webhook_events` table for duplicate event_id (idempotency)
- Processes `PAYMENT.CAPTURE.COMPLETED` event
- Updates transaction to "completed"
- Marks squares as sold (creates `purchased_squares` records)
- Invalidates caches
- Broadcasts WebSocket event

**Idempotency:**
```typescript
// Check if webhook already processed
const existingEvent = await db.webhookEvent.findUnique({
  where: { eventId },
})

if (existingEvent?.status === 'processed') {
  return 200 // Already processed, return success
}
```

**Why Idempotency Matters:**
PayPal retries webhooks if they don't receive a 200 response. Without idempotency checking, a retry could:
- Charge the donor twice
- Create duplicate purchased_squares records
- Send duplicate emails

### 5. Grid Service
**File:** `src/services/gridService.ts`

**Key Functions:**

**`lockSquares()`**
```typescript
// Optimistic locking with version check
const updated = await tx.gridSquare.updateMany({
  where: {
    id: squareId,
    status: 'available',
    version: square.version, // Version check prevents race condition
  },
  data: {
    status: 'pending',
    lockedUntil,
    version: { increment: 1 },
  },
})

if (updated.count === 0) {
  // Square was locked by another transaction
  failedSquares.push(squareId)
}
```

**`markSquaresAsSold()`**
```typescript
// Update squares to sold
await tx.gridSquare.updateMany({
  where: { id: { in: squareIds }, status: 'pending' },
  data: { status: 'sold', lockedUntil: null },
})

// Create purchased_squares records (unique constraint on square_id)
for (const squareId of squareIds) {
  await tx.purchasedSquare.create({
    data: { transactionId, squareId, donorName, donorInitials },
  })
}
```

## Concurrency Control

### Multi-Layer Protection

**Layer 1: Optimistic Locking (Application)**
- Version numbers on `grid_squares` table
- If version mismatch, square is unavailable
- Graceful error to user: "Square no longer available"

**Layer 2: Database Constraints**
```sql
-- Unique constraint on purchased_squares.square_id
CONSTRAINT unique_square_purchase UNIQUE (square_id)
```
- Even if optimistic locking fails, database prevents duplicates
- Throws error if duplicate insert attempted

**Layer 3: Lock Expiration**
- Locks expire after 5 minutes
- Background job releases expired locks
- Prevents abandoned checkouts from blocking squares forever

**Layer 4: Idempotent Webhooks**
```sql
-- Unique constraint on webhook_events.event_id
event_id VARCHAR(255) UNIQUE NOT NULL
```
- Prevents duplicate webhook processing
- PayPal retries are safe

## Testing the Payment Flow

### Setting Up PayPal Sandbox

1. **Create Sandbox Account**
   - Go to https://developer.paypal.com
   - Create REST API app
   - Get Client ID and Secret

2. **Set Environment Variables**
   ```bash
   PAYPAL_CLIENT_ID="your_sandbox_client_id"
   PAYPAL_SECRET="your_sandbox_secret"
   PAYPAL_MODE="sandbox"
   NEXT_PUBLIC_PAYPAL_CLIENT_ID="your_sandbox_client_id"
   ```

3. **Create Webhook**
   - In PayPal Developer dashboard, create webhook
   - URL: `https://your-domain.com/api/webhooks/paypal`
   - Events: Select `PAYMENT.CAPTURE.COMPLETED`
   - Copy Webhook ID to `PAYPAL_WEBHOOK_ID` env var

### Testing Locally

**Problem:** PayPal webhooks can't reach localhost

**Solution 1: ngrok (Recommended for Development)**
```bash
# Install ngrok
npm install -g ngrok

# Start your app
npm run dev

# In another terminal, create tunnel
ngrok http 3000

# Update PayPal webhook URL to ngrok URL
# Example: https://abc123.ngrok.io/api/webhooks/paypal
```

**Solution 2: Deploy to Vercel Preview**
- Push to GitHub
- Vercel auto-deploys preview
- Update PayPal webhook URL to preview URL

### Test Scenarios

**Test 1: Successful Payment**
1. Select squares
2. Enter donor info
3. Complete PayPal checkout (use sandbox test account)
4. Verify:
   - Transaction status: completed
   - Squares marked as sold
   - Donor name appears on grid
   - Cache invalidated

**Test 2: Concurrent Purchase Attempt**
1. Open campaign in two browsers
2. Select SAME square in both
3. Complete checkout in Browser 1
4. Try to checkout in Browser 2
5. Verify:
   - Browser 2 gets "square no longer available" error
   - Only one purchased_squares record created

**Test 3: Payment Cancellation**
1. Select squares
2. Enter donor info
3. Cancel PayPal checkout
4. Verify:
   - Squares unlocked
   - Transaction status: pending (or failed)
   - Squares available for others

**Test 4: Webhook Retry (Idempotency)**
1. Complete successful payment
2. Manually trigger webhook again (same event_id)
3. Verify:
   - Second webhook returns 200 OK
   - No duplicate purchased_squares records
   - No duplicate emails sent

**Test 5: Lock Expiration**
1. Select squares (locks them for 5 min)
2. Do NOT complete payment
3. Wait 5+ minutes
4. Verify:
   - Squares automatically unlocked
   - Available for other donors

### PayPal Sandbox Test Accounts

PayPal provides test accounts:

**Buyer Account (Personal)**
- Email: sb-buyer@personal.example.com
- Password: (generated by PayPal)

**Seller Account (Business)**
- Email: sb-seller@business.example.com
- Password: (generated by PayPal)

View test accounts in PayPal Developer Dashboard > Sandbox > Accounts

### Monitoring Payment Flow

**Check Transaction Status**
```bash
# Query database
SELECT id, paypal_order_id, status, donor_name, amount, created_at, completed_at
FROM transactions
WHERE paypal_order_id = 'ORDER_ID'
ORDER BY created_at DESC;
```

**Check Webhook Events**
```bash
SELECT event_id, event_type, status, processed_at, error_message
FROM webhook_events
WHERE event_id = 'EVENT_ID';
```

**Check Grid Square Status**
```bash
SELECT id, position_x, position_y, status, locked_until
FROM grid_squares
WHERE campaign_id = 'CAMPAIGN_ID'
AND status = 'pending';
```

## Error Handling

### Common Errors

**"Invalid or expired lock token"**
- Lock expired (5 min timeout)
- User took too long to pay
- Solution: Select squares again

**"Square no longer available"**
- Another donor purchased it first
- Solution: Select different squares

**"Failed to capture payment"**
- PayPal API error
- Insufficient funds
- Solution: Check PayPal logs, try different payment method

**"Invalid signature" (Webhook)**
- Webhook not from PayPal
- PAYPAL_WEBHOOK_ID mismatch
- Solution: Verify webhook configuration

### Debugging Tips

**Enable Verbose Logging**
```typescript
// In webhook handler
console.log('Webhook received:', {
  eventId,
  eventType,
  orderId,
  captureId,
})
```

**Check PayPal Dashboard**
- View sandbox transactions
- Check webhook delivery status
- Retry failed webhooks manually

**Use PayPal Sandbox Simulator**
- Simulate various payment scenarios
- Test refunds, disputes, chargebacks

## Security Checklist

- [x] Webhook signature verification
- [x] Server-side amount calculation (never trust client)
- [x] Lock token validation
- [x] Campaign status check before payment
- [x] Idempotent webhook processing
- [x] Database constraints (unique square purchase)
- [x] HTTPS only (in production)
- [x] Rate limiting on payment endpoints
- [x] Input validation with Zod schemas

## Production Checklist

Before going live:

1. **Switch to Production Credentials**
   ```bash
   PAYPAL_CLIENT_ID="production_client_id"
   PAYPAL_SECRET="production_secret"
   PAYPAL_MODE="production"
   ```

2. **Update Webhook URL**
   - Point to production domain
   - Get new PAYPAL_WEBHOOK_ID

3. **Test with Real Account**
   - Make $1 donation
   - Verify webhook delivery
   - Check transaction in PayPal dashboard

4. **Monitor for 24 Hours**
   - Check webhook success rate
   - Watch for errors in logs
   - Verify caches invalidating

5. **Set Up Alerts**
   - Payment failure rate > 5%
   - Webhook processing errors
   - Database deadlocks

## Common Issues & Solutions

**Issue: Webhook not received**
- Check firewall/CORS settings
- Verify webhook URL is publicly accessible
- Check PayPal webhook delivery status

**Issue: Duplicate purchases**
- Verify optimistic locking working
- Check database constraints created
- Ensure webhook idempotency check

**Issue: Squares stuck in "pending"**
- Run lock expiration job
- Check for failed transactions
- Manually unlock if needed

**Issue: Cache not invalidating**
- Verify Redis connection
- Check cache key format
- Clear cache manually if needed

## Performance Optimization

**Reduce Lock Contention**
- Keep lock time short (5 min max)
- Release locks immediately on cancel
- Background job for expired locks

**Database Indexing**
```sql
-- Critical indexes
CREATE INDEX idx_grid_squares_status ON grid_squares(status);
CREATE INDEX idx_grid_squares_locked_until ON grid_squares(locked_until);
CREATE INDEX idx_transactions_paypal_order_id ON transactions(paypal_order_id);
CREATE INDEX idx_webhook_events_event_id ON webhook_events(event_id);
```

**Caching Strategy**
- Cache grid state (60s TTL)
- Invalidate on purchase completion
- Use Redis for lock tokens

## Next Steps

After payment integration is working:

1. **Add Email Notifications**
   - Donor: Purchase receipt
   - Athlete: New donation alert
   - Use SendGrid or Resend

2. **Add Real-time Updates**
   - WebSocket server (Socket.io)
   - Broadcast grid updates on purchase
   - Show live donor count

3. **Add Refund Capability**
   - Admin-only endpoint
   - Call PayPal refund API
   - Mark transaction as refunded
   - Optionally release squares

4. **Add Transaction Reports**
   - Export to CSV
   - Summary by date range
   - Tax receipts for donors

---

**Need Help?**
- Check PayPal Developer Docs: https://developer.paypal.com/docs/checkout/
- View webhook logs in PayPal dashboard
- Test in sandbox before production
