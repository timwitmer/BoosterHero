# Cron Job Setup - Expired Lock Cleanup

## Overview

Square locks expire after 5 minutes if payment is not completed. The system needs to automatically release these expired locks so the squares become available again.

## Implementation

### 1. API Endpoint
- **URL**: `/api/cron/release-locks`
- **Method**: GET
- **Function**: Checks for squares with `status='pending'` and `lockedUntil < now()`, then resets them to `available`

### 2. Development (Local)
**Current Implementation**: Client-side polling
- Automatically triggered when viewing a campaign page
- Runs every 2 minutes while page is open
- Not ideal but works for development

**Manual Trigger**:
```bash
curl http://localhost:3000/api/cron/release-locks
```

### 3. Production (Vercel)
**Automatic Cron** (Recommended):
- Configured in `vercel.json`
- Runs every 2 minutes automatically
- No setup needed after deployment

**Configuration** (`vercel.json`):
```json
{
  "crons": [
    {
      "path": "/api/cron/release-locks",
      "schedule": "*/2 * * * *"
    }
  ]
}
```

### 4. Production (Other Platforms)

#### Option A: External Cron Service
Use a free service like:
- **cron-job.org**: https://cron-job.org
- **EasyCron**: https://www.easycron.com
- **GitHub Actions**

Setup:
1. Create an account
2. Add a new cron job
3. Set URL: `https://yourdomain.com/api/cron/release-locks`
4. Set schedule: Every 2 minutes (`*/2 * * * *`)

#### Option B: Add Authentication (Recommended for Production)
Uncomment the auth check in `/src/app/api/cron/release-locks/route.ts`:

```typescript
const authHeader = request.headers.get('authorization')
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

Add to `.env`:
```
CRON_SECRET=your_random_secret_here
```

Update external cron service to include header:
```
Authorization: Bearer your_random_secret_here
```

## Testing

### Test Expired Lock Release
```bash
# 1. Create some test locks that are expired
npm run tsx scripts/test-expired-locks.ts

# 2. Call the cron endpoint
curl http://localhost:3000/api/cron/release-locks

# 3. Check the response
# Should show: "Released X expired locks"
```

### Manual Reset All Pending Squares
```bash
npm run tsx scripts/reset-pending-squares.ts
```

## Monitoring

The cron endpoint returns:
```json
{
  "success": true,
  "message": "Released 3 expired locks",
  "releasedCount": 3,
  "timestamp": "2026-03-16T19:00:00.000Z"
}
```

Check Vercel logs or your monitoring dashboard to ensure it's running successfully.

## Lock Duration

Current lock timeout: **5 minutes**

Configured in `/src/services/gridService.ts`:
```typescript
const lockedUntil = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
```

To change, update this value in the `lockSquares()` function.
