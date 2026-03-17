# Backend API Development Standards - BoosterHero

## Overview
This skill defines backend API development patterns for BoosterHero using Next.js 15 API Routes, Prisma 6, PostgreSQL, Redis, and Clerk authentication.

## Tech Stack
- **Framework**: Next.js 15 API Routes (App Router)
- **Database**: PostgreSQL (Neon) with Prisma 6
- **Cache**: Redis (Upstash)
- **Authentication**: Clerk
- **Payment**: PayPal REST API
- **Validation**: Zod schemas

## API Route Structure

### File Organization
```
src/app/api/
├── campaigns/
│   ├── route.ts                      # GET /api/campaigns, POST /api/campaigns
│   └── [slug]/
│       ├── activate/route.ts         # POST /api/campaigns/:slug/activate
│       ├── pause/route.ts            # POST /api/campaigns/:slug/pause
│       ├── qr-code/route.ts          # GET /api/campaigns/:slug/qr-code
│       └── grid/
│           ├── route.ts              # GET /api/campaigns/:slug/grid
│           ├── lock/route.ts         # POST /api/campaigns/:slug/grid/lock
│           └── unlock/route.ts       # POST /api/campaigns/:slug/grid/unlock
├── payments/
│   ├── create-order/route.ts        # POST /api/payments/create-order
│   └── capture-order/route.ts       # POST /api/payments/capture-order
├── webhooks/
│   └── paypal/route.ts              # POST /api/webhooks/paypal
└── cron/
    └── release-locks/route.ts       # GET /api/cron/release-locks
```

### Route Naming Conventions
- Use kebab-case for URLs (`create-order`, not `createOrder`)
- Use RESTful conventions (GET, POST, PUT, DELETE)
- Group related routes in folders
- Use `[slug]` for dynamic segments (not `[id]` when using slugs)

## API Route Pattern

### Basic Structure
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@clerk/nextjs/server'
import { mySchema } from '@/lib/validations'

/**
 * POST /api/resource
 * Description of what this endpoint does
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Parse request body
    const body = await request.json()

    // 2. Validate input with Zod
    const validation = mySchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    // 3. Check authentication (if needed)
    const { userId: clerkUserId } = await auth()
    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 4. Get user from database
    const user = await db.user.findUnique({
      where: { clerkUserId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // 5. Business logic
    const result = await db.resource.create({
      data: {
        userId: user.id,
        ...validation.data,
      },
    })

    // 6. Return success response
    return NextResponse.json({
      success: true,
      data: result,
    })

  } catch (error: any) {
    // 7. Error handling
    console.error('API error:', error)

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Dynamic Route Parameters (Next.js 15)
```typescript
// ✅ Correct - Async params in Next.js 15
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const campaign = await db.campaign.findUnique({
    where: { slug },
  })

  return NextResponse.json({ success: true, data: campaign })
}

// ❌ Incorrect - Sync params
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }  // Wrong!
) {
  // ...
}
```

## Authentication

### Clerk Integration
```typescript
import { auth, currentUser } from '@clerk/nextjs/server'

// ✅ Get user ID only
export async function POST(request: NextRequest) {
  const { userId: clerkUserId } = await auth()

  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get full user from database
  const user = await db.user.findUnique({
    where: { clerkUserId },
  })
}

// ✅ Get full Clerk user object (when needed)
export async function POST(request: NextRequest) {
  const clerkUser = await currentUser()

  if (!clerkUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Sync with database
  const user = await db.user.upsert({
    where: { clerkUserId: clerkUser.id },
    update: {
      email: clerkUser.emailAddresses[0]?.emailAddress,
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
    },
    create: {
      clerkUserId: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
      firstName: clerkUser.firstName || '',
      lastName: clerkUser.lastName || '',
    },
  })
}
```

### Public vs Protected Routes
```typescript
// ✅ Public route (no auth check)
export async function GET(request: NextRequest) {
  const campaigns = await db.campaign.findMany({
    where: { status: 'active' },
  })
  return NextResponse.json({ success: true, data: campaigns })
}

// ✅ Protected route (requires auth)
export async function POST(request: NextRequest) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ... protected logic
}

// ✅ Owner-only route (resource ownership check)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { userId: clerkUserId } = await auth()

  if (!clerkUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await db.user.findUnique({ where: { clerkUserId } })

  const campaign = await db.campaign.findFirst({
    where: { slug, userId: user?.id },
  })

  if (!campaign) {
    return NextResponse.json(
      { error: 'Campaign not found or access denied' },
      { status: 404 }
    )
  }

  // ... deletion logic
}
```

## Validation with Zod

### Schema Definition
```typescript
// src/lib/validations.ts
import { z } from 'zod'

// ✅ Define reusable schemas
export const createCampaignSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().min(1).max(2000).optional(),
  sport: z.string().min(1).max(100),
  teamName: z.string().max(255).optional(),
  schoolName: z.string().max(255).optional(),
  athletePhotoUrl: z.string().url().optional(),
  fundraisingGoal: z.number().positive(),
  gridRows: z.number().int().min(5).max(20),
  gridCols: z.number().int().min(5).max(20),
})

export const lockSquaresSchema = z.object({
  squareIds: z.array(z.string().uuid()).min(1),
})

export const capturePaymentOrderSchema = z.object({
  orderId: z.string().min(1),
})
```

### Usage in Routes
```typescript
import { createCampaignSchema } from '@/lib/validations'

export async function POST(request: NextRequest) {
  const body = await request.json()

  // ✅ Validate with safeParse
  const validation = createCampaignSchema.safeParse(body)

  if (!validation.success) {
    return NextResponse.json(
      {
        error: 'Invalid input',
        details: validation.error.errors  // Detailed validation errors
      },
      { status: 400 }
    )
  }

  // ✅ Use validated data
  const data = validation.data

  // ... rest of logic
}
```

## Database Operations with Prisma

### Basic CRUD Operations
```typescript
// ✅ Create
const campaign = await db.campaign.create({
  data: {
    title: 'My Campaign',
    slug: 'my-campaign',
    userId: user.id,
    status: 'draft',
  },
})

// ✅ Read (findUnique)
const campaign = await db.campaign.findUnique({
  where: { slug: 'my-campaign' },
  include: {
    user: true,
    gridSquares: true,
  },
})

// ✅ Read (findMany with filters)
const campaigns = await db.campaign.findMany({
  where: {
    userId: user.id,
    status: 'active',
  },
  orderBy: {
    createdAt: 'desc',
  },
  take: 10,
})

// ✅ Update
const updated = await db.campaign.update({
  where: { id: campaignId },
  data: {
    status: 'active',
  },
})

// ✅ Delete
await db.campaign.delete({
  where: { id: campaignId },
})

// ✅ Upsert (update or create)
const user = await db.user.upsert({
  where: { clerkUserId: 'user_123' },
  update: { email: 'new@email.com' },
  create: {
    clerkUserId: 'user_123',
    email: 'new@email.com',
    firstName: 'John',
    lastName: 'Doe',
  },
})
```

### Transactions
```typescript
// ✅ Use transactions for multiple related operations
await db.$transaction(async (tx) => {
  // Get campaign
  const campaign = await tx.campaign.findUnique({
    where: { slug: campaignSlug },
  })

  if (!campaign) {
    throw new Error('Campaign not found')
  }

  // Fetch all squares at once (performance optimization)
  const squares = await tx.gridSquare.findMany({
    where: {
      id: { in: squareIds },
      campaignId: campaign.id,
    },
  })

  // Create map for quick lookup
  const squareMap = new Map(squares.map(s => [s.id, s]))

  // Check availability and lock
  for (const squareId of squareIds) {
    const square = squareMap.get(squareId)

    if (!square || square.status !== 'available') {
      throw new Error(`Square ${squareId} is not available`)
    }

    await tx.gridSquare.update({
      where: { id: squareId },
      data: {
        status: 'pending',
        lockedUntil: new Date(Date.now() + 5 * 60 * 1000),
      },
    })
  }

  // Create transaction record
  await tx.transaction.create({
    data: {
      campaignId: campaign.id,
      amount: totalAmount,
      status: 'pending',
    },
  })
})

// ✅ Transaction with custom timeout (if needed)
await db.$transaction(async (tx) => {
  // ... operations
}, {
  timeout: 10000,  // 10 seconds (default is 5s)
})
```

### Optimistic Locking with Version Numbers
```typescript
// ✅ Prevent race conditions with version field
const square = await db.gridSquare.findUnique({
  where: { id: squareId },
})

if (square.version !== expectedVersion) {
  throw new Error('Square was modified by another user')
}

await db.gridSquare.update({
  where: {
    id: squareId,
    version: expectedVersion,  // Only update if version matches
  },
  data: {
    status: 'sold',
    version: { increment: 1 },  // Increment version
  },
})
```

### Efficient Queries
```typescript
// ✅ Select only needed fields
const campaigns = await db.campaign.findMany({
  select: {
    id: true,
    title: true,
    slug: true,
    status: true,
    _count: {
      select: { gridSquares: true },
    },
  },
})

// ✅ Use includes judiciously
const campaign = await db.campaign.findUnique({
  where: { slug },
  include: {
    user: {
      select: {
        firstName: true,
        lastName: true,
      },
    },
    gridSquares: {
      include: {
        purchasedSquares: {
          select: {
            donorName: true,
            donorInitials: true,
          },
        },
      },
      orderBy: [
        { positionY: 'asc' },
        { positionX: 'asc' },
      ],
    },
  },
})

// ✅ Batch operations for better performance
await db.gridSquare.updateMany({
  where: {
    status: 'pending',
    lockedUntil: {
      lt: new Date(),
    },
  },
  data: {
    status: 'available',
    lockedUntil: null,
  },
})
```

## Redis Caching

### Cache Pattern
```typescript
import { redis, CACHE_KEYS, CACHE_TTL } from '@/lib/redis'

// ✅ Get with cache
export async function getGridState(campaignSlug: string) {
  // Try cache first
  try {
    const cacheKey = CACHE_KEYS.grid(campaignSlug)
    const cached = await redis.get(cacheKey)

    if (cached) {
      console.log('Cache hit:', campaignSlug)
      return JSON.parse(cached)
    }
  } catch (error) {
    // Redis not available, continue without cache
    console.log('Redis unavailable, fetching from database')
  }

  // Fetch from database
  const campaign = await db.campaign.findUnique({
    where: { slug: campaignSlug },
    include: { gridSquares: true },
  })

  const data = transformData(campaign)

  // Cache for future requests
  try {
    const cacheKey = CACHE_KEYS.grid(campaignSlug)
    await redis.setex(cacheKey, CACHE_TTL.grid, JSON.stringify(data))
  } catch (error) {
    // Non-critical error
    console.log('Cache write failed (non-critical)')
  }

  return data
}

// ✅ Invalidate cache after updates
export async function updateCampaign(slug: string, data: any) {
  await db.campaign.update({
    where: { slug },
    data,
  })

  // Invalidate cache
  try {
    await redis.del(CACHE_KEYS.grid(slug))
    await redis.del(CACHE_KEYS.campaign(slug))
  } catch (error) {
    console.log('Cache invalidation failed (non-critical)')
  }
}
```

### Cache Keys
```typescript
// src/lib/redis.ts
export const CACHE_KEYS = {
  campaign: (slug: string) => `campaign:${slug}`,
  grid: (slug: string) => `campaign:${slug}:grid`,
  stats: (slug: string) => `campaign:${slug}:stats`,
  lock: (lockToken: string) => `lock:${lockToken}`,
} as const

export const CACHE_TTL = {
  campaign: 300,  // 5 minutes
  grid: 60,       // 1 minute (frequently updated)
  stats: 120,     // 2 minutes
  lock: 300,      // 5 minutes
} as const
```

## Error Handling

### Structured Error Responses
```typescript
// ✅ Consistent error format
interface ApiError {
  error: string
  details?: any
  code?: string
}

// ✅ Different error types
export async function POST(request: NextRequest) {
  try {
    // ... logic
  } catch (error: any) {
    console.error('API error:', error)

    // Handle specific error types
    if (error.code === 'P2002') {
      // Prisma unique constraint violation
      return NextResponse.json(
        { error: 'Resource already exists', code: 'DUPLICATE' },
        { status: 409 }
      )
    }

    if (error.message === 'Campaign not found') {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Generic server error
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Variable Scope for Error Handling
```typescript
// ✅ Declare variables outside try block for error handler access
export async function POST(request: NextRequest) {
  let orderId: string | undefined
  let eventId: string | undefined

  try {
    const body = await request.json()
    orderId = body.orderId
    eventId = body.eventId

    // ... processing logic

  } catch (error: any) {
    console.error('Error:', error)

    // Can access orderId and eventId here for cleanup
    if (orderId) {
      await db.order.update({
        where: { id: orderId },
        data: { status: 'failed' },
      })
    }

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

## Service Layer

### Business Logic Separation
```typescript
// src/services/gridService.ts

// ✅ Move complex business logic to service layer
export async function lockSquares(
  campaignSlug: string,
  squareIds: string[],
  lockToken: string
): Promise<LockSquaresResult> {
  const lockedUntil = new Date(Date.now() + 5 * 60 * 1000)

  await db.$transaction(async (tx) => {
    const campaign = await tx.campaign.findUnique({
      where: { slug: campaignSlug },
    })

    if (!campaign) {
      throw new Error('Campaign not found')
    }

    if (campaign.status !== 'active') {
      throw new Error('Campaign is not active')
    }

    // Fetch all squares at once for performance
    const squares = await tx.gridSquare.findMany({
      where: {
        id: { in: squareIds },
        campaignId: campaign.id,
      },
    })

    const squareMap = new Map(squares.map(s => [s.id, s]))
    const lockedSquares: string[] = []
    const failedSquares: string[] = []

    for (const squareId of squareIds) {
      const square = squareMap.get(squareId)

      if (!square || square.status !== 'available') {
        failedSquares.push(squareId)
        continue
      }

      await tx.gridSquare.update({
        where: { id: squareId },
        data: {
          status: 'pending',
          lockedUntil,
        },
      })

      lockedSquares.push(squareId)
    }

    if (lockedSquares.length === 0) {
      throw new Error('No squares could be locked')
    }

    // Store lock info in Redis
    const lockInfo = {
      campaignId: campaign.id,
      campaignSlug: campaign.slug,
      squareIds: lockedSquares,
      totalAmount: calculateTotal(lockedSquares, squareMap),
      lockedUntil: lockedUntil.toISOString(),
    }

    try {
      await redis.setex(
        CACHE_KEYS.lock(lockToken),
        CACHE_TTL.lock,
        JSON.stringify(lockInfo)
      )
    } catch (error) {
      console.log('Redis unavailable for lock storage (non-critical)')
    }

    return {
      success: true,
      lockedSquares: lockedSquares.map(id => squareMap.get(id)!),
      failedSquares,
      lockToken,
      totalAmount: lockInfo.totalAmount,
    }
  })
}

// ✅ API route uses service
export async function POST(request: NextRequest) {
  const { squareIds } = await request.json()
  const lockToken = randomBytes(32).toString('hex')

  const result = await lockSquares(campaignSlug, squareIds, lockToken)

  return NextResponse.json({
    success: true,
    lockToken: result.lockToken,
    lockedSquares: result.lockedSquares,
    totalAmount: result.totalAmount,
  })
}
```

## External API Integration

### PayPal REST API Pattern
```typescript
// src/lib/paypal.ts

const PAYPAL_API_BASE = process.env.PAYPAL_MODE === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

// ✅ Get access token
async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
  ).toString('base64')

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    throw new Error('Failed to get PayPal access token')
  }

  const data = await response.json()
  return data.access_token
}

// ✅ Create order
export async function createOrder(params: CreateOrderParams) {
  try {
    const accessToken = await getAccessToken()

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value: params.amount,
          },
          description: params.description,
        }],
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('PayPal error:', error)
      throw new Error('Failed to create PayPal order')
    }

    return await response.json()
  } catch (error) {
    console.error('PayPal create order error:', error)
    throw error
  }
}
```

## Webhooks

### Webhook Handler Pattern
```typescript
// src/app/api/webhooks/paypal/route.ts

export async function POST(request: NextRequest) {
  let eventId: string | undefined

  try {
    const body = await request.json()
    eventId = body.id

    // 1. Verify webhook signature
    const headers = {
      'paypal-transmission-id': request.headers.get('paypal-transmission-id') || '',
      'paypal-transmission-time': request.headers.get('paypal-transmission-time') || '',
      'paypal-cert-url': request.headers.get('paypal-cert-url') || '',
      'paypal-auth-algo': request.headers.get('paypal-auth-algo') || '',
      'paypal-transmission-sig': request.headers.get('paypal-transmission-sig') || '',
    }

    const isValid = await verifyWebhookSignature(headers, body)
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    // 2. Check for duplicate webhook (idempotency)
    const existing = await db.webhookEvent.findUnique({
      where: { eventId },
    })

    if (existing) {
      console.log('Duplicate webhook received:', eventId)
      return NextResponse.json({ received: true })
    }

    // 3. Store webhook event
    await db.webhookEvent.create({
      data: {
        eventId,
        eventType: body.event_type,
        resourceId: body.resource?.id,
        payload: body,
        status: 'processing',
      },
    })

    // 4. Process event based on type
    switch (body.event_type) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await handlePaymentCaptured(body)
        break

      case 'PAYMENT.CAPTURE.DENIED':
        await handlePaymentDenied(body)
        break

      default:
        console.log('Unhandled webhook event:', body.event_type)
    }

    // 5. Mark as processed
    await db.webhookEvent.update({
      where: { eventId },
      data: { status: 'processed' },
    })

    return NextResponse.json({ received: true })

  } catch (error: any) {
    console.error('Webhook error:', error)

    // Mark as failed
    if (eventId) {
      await db.webhookEvent.update({
        where: { eventId },
        data: {
          status: 'failed',
          errorMessage: error.message,
        },
      })
    }

    // Return 200 to acknowledge receipt (prevent retries)
    return NextResponse.json({ error: error.message }, { status: 200 })
  }
}
```

## Cron Jobs

### Background Job Pattern
```typescript
// src/app/api/cron/release-locks/route.ts

/**
 * GET /api/cron/release-locks
 * Release expired square locks
 * Called by Vercel Cron or external service
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Authentication for cron endpoint
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Running expired locks cleanup...')

    const releasedCount = await releaseExpiredLocks()

    return NextResponse.json({
      success: true,
      message: `Released ${releasedCount} expired locks`,
      releasedCount,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Cron job error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to release locks',
        message: error.message,
      },
      { status: 500 }
    )
  }
}
```

## Best Practices Summary

### DO ✅
- Always validate input with Zod schemas
- Use transactions for multi-step database operations
- Handle authentication with Clerk's async `auth()`
- Await dynamic route params in Next.js 15
- Implement proper error handling with try-catch
- Log errors with context for debugging
- Use service layer for complex business logic
- Cache frequently accessed data in Redis
- Invalidate cache after data updates
- Return consistent API response formats
- Use TypeScript strict mode

### DON'T ❌
- Don't trust client input without validation
- Don't expose sensitive data in error messages
- Don't forget to await Clerk's `auth()` function
- Don't use sync params in Next.js 15 routes
- Don't put business logic directly in route handlers
- Don't ignore cache errors (handle gracefully)
- Don't forget transaction timeouts for long operations
- Don't skip idempotency checks in webhooks
- Don't return 500 errors for webhook failures (return 200)
- Don't use `any` type - use proper TypeScript types

## Testing Endpoints

### Manual Testing with cURL
```bash
# GET request
curl http://localhost:3000/api/campaigns/my-campaign

# POST request with JSON
curl -X POST http://localhost:3000/api/campaigns \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Campaign","sport":"Football","fundraisingGoal":1000}'

# With authentication header
curl -X POST http://localhost:3000/api/cron/release-locks \
  -H "Authorization: Bearer your-secret"
```

### Logging Best Practices
```typescript
// ✅ Log with context
console.log('Creating order:', {
  campaignSlug,
  squareIds: squareIds.length,
  amount,
})

// ✅ Log errors with full context
console.error('Payment capture failed:', {
  orderId,
  error: error.message,
  stack: error.stack,
})

// ✅ Log performance metrics
const startTime = Date.now()
await expensiveOperation()
console.log('Operation completed in', Date.now() - startTime, 'ms')
```
