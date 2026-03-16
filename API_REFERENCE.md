# GridGive API Reference

## Base URL
- Development: `http://localhost:3000`
- Production: `https://gridgive.com`

## Authentication
Most endpoints require authentication via Clerk. Include the Clerk session token in requests.

Donor-facing endpoints (grid viewing, payment) do NOT require authentication.

---

## Payment Flow Endpoints

### 1. Lock Squares

Lock squares for purchase to prevent concurrent access.

**Endpoint:** `POST /api/campaigns/:slug/grid/lock`

**Request:**
```json
{
  "squareIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "lockToken": "64_char_hex_string",
  "lockedSquares": [
    {
      "id": "uuid",
      "positionX": 0,
      "positionY": 0,
      "squareValue": "5.00",
      "status": "pending"
    }
  ],
  "failedSquares": [],
  "totalAmount": "15.00",
  "expiresAt": "2024-01-01T12:05:00.000Z"
}
```

**Errors:**
- `400` - Campaign not active
- `404` - Campaign not found
- `409` - No squares could be locked (all taken)

**Notes:**
- Locks expire after 5 minutes
- Version-based optimistic locking
- Failed squares are returned separately

---

### 2. Unlock Squares

Unlock squares (on payment cancel/failure).

**Endpoint:** `POST /api/campaigns/:slug/grid/unlock`

**Request:**
```json
{
  "lockToken": "64_char_hex_string"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Squares unlocked successfully"
}
```

**Errors:**
- `400` - Lock token required
- `500` - Internal server error

---

### 3. Create Payment Order

Create a PayPal order for locked squares.

**Endpoint:** `POST /api/payments/create-order`

**Request:**
```json
{
  "lockToken": "64_char_hex_string",
  "donorEmail": "donor@example.com",
  "donorName": "John Doe"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "orderId": "PAYPAL_ORDER_ID",
  "transactionId": "uuid",
  "approvalUrl": "https://www.paypal.com/checkoutnow?token=...",
  "amount": "15.00"
}
```

**Errors:**
- `400` - Invalid input or expired lock token
- `404` - Campaign not found
- `500` - Failed to create PayPal order

**Notes:**
- Verifies lock token validity
- Creates transaction record (status: pending)
- Server calculates amount (never trusts client)

---

### 4. Capture Payment Order

Capture payment after buyer approval.

**Endpoint:** `POST /api/payments/capture-order`

**Request:**
```json
{
  "orderId": "PAYPAL_ORDER_ID"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "transactionId": "uuid",
  "captureId": "PAYPAL_CAPTURE_ID",
  "status": "COMPLETED",
  "amount": "15.00",
  "message": "Payment captured successfully. Processing..."
}
```

**Errors:**
- `400` - Invalid input or transaction already processed
- `404` - Transaction not found
- `500` - Failed to capture payment

**Notes:**
- Updates transaction to "processing"
- Webhook finalizes to "completed"
- Returns immediately (async processing)

---

### 5. Payment Status

Get payment status (for polling).

**Endpoint:** `GET /api/payments/status/:transactionId`

**Response (200 OK):**
```json
{
  "success": true,
  "transactionId": "uuid",
  "status": "completed",
  "amount": "15.00",
  "donorName": "John Doe",
  "completedAt": "2024-01-01T12:00:00.000Z"
}
```

**Errors:**
- `404` - Transaction not found
- `500` - Internal server error

**Status Values:**
- `pending` - Payment not yet captured
- `processing` - Captured, waiting for webhook
- `completed` - Payment confirmed, squares sold
- `failed` - Payment failed
- `refunded` - Payment refunded

---

### 6. PayPal Webhook

Handle PayPal webhook events (internal).

**Endpoint:** `POST /api/webhooks/paypal`

**Headers:**
```
paypal-transmission-id: <uuid>
paypal-transmission-time: <iso-8601>
paypal-transmission-sig: <signature>
paypal-cert-url: <cert-url>
paypal-auth-algo: SHA256withRSA
```

**Request:**
```json
{
  "id": "WH-<uuid>",
  "event_version": "1.0",
  "create_time": "2024-01-01T12:00:00Z",
  "resource_type": "capture",
  "event_type": "PAYMENT.CAPTURE.COMPLETED",
  "resource": {
    "id": "CAPTURE-ID",
    "status": "COMPLETED",
    "amount": {
      "currency_code": "USD",
      "value": "15.00"
    },
    "supplementary_data": {
      "related_ids": {
        "order_id": "PAYPAL_ORDER_ID"
      }
    }
  }
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Webhook processed successfully"
}
```

**Errors:**
- `401` - Invalid signature
- `500` - Webhook processing failed (PayPal retries)

**Event Types Handled:**
- `PAYMENT.CAPTURE.COMPLETED` - Payment successful
- `PAYMENT.CAPTURE.DENIED` - Payment denied
- `PAYMENT.CAPTURE.DECLINED` - Payment declined
- `PAYMENT.CAPTURE.REFUNDED` - Payment refunded

**Notes:**
- Verifies webhook signature
- Idempotent (checks `webhook_events` table)
- Returns 200 even for duplicates
- PayPal retries on non-200 response

---

## Campaign Endpoints

### Get Campaign Details

**Endpoint:** `GET /api/campaigns/:slug`

**Response (200 OK):**
```json
{
  "success": true,
  "campaign": {
    "id": "uuid",
    "slug": "athlete-name",
    "title": "John Doe - Football Fundraiser",
    "description": "Help me raise funds for...",
    "sport": "football",
    "teamName": "Eagles",
    "schoolName": "Lincoln High School",
    "fundraisingGoal": "1000.00",
    "gridRows": 10,
    "gridCols": 10,
    "status": "active",
    "qrCodeUrl": "https://...",
    "createdAt": "2024-01-01T12:00:00.000Z"
  }
}
```

---

### Get Grid State

**Endpoint:** `GET /api/campaigns/:slug/grid`

**Response (200 OK):**
```json
{
  "success": true,
  "squares": [
    {
      "id": "uuid",
      "positionX": 0,
      "positionY": 0,
      "squareValue": "5.00",
      "status": "available"
    },
    {
      "id": "uuid",
      "positionX": 1,
      "positionY": 0,
      "squareValue": "5.00",
      "status": "sold",
      "donorName": "John Doe",
      "donorInitials": "JD"
    }
  ],
  "stats": {
    "totalSquares": 100,
    "squaresSold": 25,
    "squaresAvailable": 75,
    "totalRaised": 125.00,
    "completionPercentage": 25
  }
}
```

---

### Get Campaign Stats

**Endpoint:** `GET /api/campaigns/:slug/stats`

**Response (200 OK):**
```json
{
  "success": true,
  "stats": {
    "totalSquares": 100,
    "squaresSold": 25,
    "squaresAvailable": 75,
    "totalRaised": 125.00,
    "totalDonors": 15,
    "completionPercentage": 25,
    "lastDonationAt": "2024-01-01T12:00:00.000Z"
  }
}
```

---

## Error Response Format

All error responses follow this format:

```json
{
  "error": "Human-readable error message",
  "details": {} // Optional: Additional error details
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (e.g., square already taken)
- `500` - Internal Server Error

---

## Rate Limiting

**Limits:**
- Lock squares: 10 requests per minute per IP
- Create order: 5 requests per minute per IP
- Get grid state: 30 requests per minute per IP
- Webhook: No limit (PayPal retries)

**Response (429 Too Many Requests):**
```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "retryAfter": 60
}
```

---

## WebSocket Events

### Connect to Campaign Room

```javascript
import io from 'socket.io-client'

const socket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL)

// Join campaign room
socket.emit('join_campaign', { campaignSlug: 'athlete-name' })

// Listen for grid updates
socket.on('grid_updated', (data) => {
  console.log('Grid updated:', data.squares)
  // Update UI with new square states
})

// Listen for stats updates
socket.on('stats_updated', (data) => {
  console.log('Stats updated:', data.stats)
  // Update progress bar, counters
})

// Disconnect when leaving page
socket.emit('leave_campaign', { campaignSlug: 'athlete-name' })
socket.disconnect()
```

**Events:**
- `join_campaign` - Subscribe to campaign updates
- `leave_campaign` - Unsubscribe from campaign updates
- `grid_updated` - Grid state changed (square purchased)
- `stats_updated` - Campaign stats updated
- `connection_count` - Number of active viewers

---

## Testing with cURL

### Lock Squares
```bash
curl -X POST http://localhost:3000/api/campaigns/test-campaign/grid/lock \
  -H "Content-Type: application/json" \
  -d '{"squareIds":["uuid1","uuid2"]}'
```

### Create Order
```bash
curl -X POST http://localhost:3000/api/payments/create-order \
  -H "Content-Type: application/json" \
  -d '{
    "lockToken": "your_lock_token",
    "donorEmail": "test@example.com",
    "donorName": "Test Donor"
  }'
```

### Get Payment Status
```bash
curl http://localhost:3000/api/payments/status/transaction-uuid
```

### Simulate Webhook (Development Only)
```bash
npx tsx scripts/simulate-webhook.ts PAYPAL_ORDER_ID
```

---

## Frontend Integration Example

```typescript
// Lock squares
const lockResponse = await fetch(`/api/campaigns/${slug}/grid/lock`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ squareIds: selectedSquareIds }),
})
const { lockToken, totalAmount } = await lockResponse.json()

// Create order
const orderResponse = await fetch('/api/payments/create-order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ lockToken, donorEmail, donorName }),
})
const { orderId, approvalUrl } = await orderResponse.json()

// Open PayPal modal (handled by PayPalButton component)
// ...

// After approval, capture order
const captureResponse = await fetch('/api/payments/capture-order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ orderId }),
})
const { transactionId } = await captureResponse.json()

// Poll for completion (or use WebSocket)
const checkStatus = async () => {
  const statusResponse = await fetch(`/api/payments/status/${transactionId}`)
  const { status } = await statusResponse.json()

  if (status === 'completed') {
    // Show success message
    // Grid updates via WebSocket
  } else if (status === 'failed') {
    // Show error message
  } else {
    // Still processing, check again
    setTimeout(checkStatus, 2000)
  }
}
checkStatus()
```

---

## Security Best Practices

1. **Always validate on server**
   - Never trust client-sent amounts
   - Verify lock tokens before creating orders
   - Check campaign status before processing

2. **Verify webhook signatures**
   - Use `verifyWebhookSignature()` function
   - Reject webhooks with invalid signatures
   - Log suspicious webhook attempts

3. **Idempotency is critical**
   - Check `webhook_events` table before processing
   - Use unique event_id from PayPal
   - Return 200 for duplicate events

4. **Rate limiting**
   - Implement rate limiting on all public endpoints
   - Stricter limits on payment endpoints
   - Monitor for abuse patterns

5. **HTTPS only in production**
   - Enforce HTTPS for all traffic
   - Use secure cookies
   - Enable HSTS headers

---

For detailed implementation guide, see [PAYMENT_INTEGRATION.md](./PAYMENT_INTEGRATION.md)
