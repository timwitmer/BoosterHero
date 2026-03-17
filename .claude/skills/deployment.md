# Deployment & DevOps Standards - BoosterHero

## Overview
This skill defines deployment, infrastructure, and DevOps practices for the BoosterHero application on Vercel with external services.

## Infrastructure Stack

### Core Services
- **Hosting**: Vercel (Next.js App Router)
- **Database**: Neon PostgreSQL (Serverless)
- **Cache**: Upstash Redis (Serverless)
- **Auth**: Clerk (SaaS)
- **Payment**: PayPal (Sandbox/Production)
- **Email**: SendGrid (SaaS) - Optional
- **Repository**: GitHub

### Service Limits & Tiers
- **Vercel Free**: 100GB bandwidth, 100GB-hrs compute
- **Neon Free**: 512MB storage, 0.5GB data transfer
- **Upstash Free**: 10k commands/day, 256MB storage
- **Clerk Free**: 10k MAU (Monthly Active Users)

## Environment Configuration

### Environment Variables

#### Required for All Environments
```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/db?sslmode=require"

# Redis
REDIS_URL="rediss://default:pass@host:6379"

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."

# PayPal
PAYPAL_CLIENT_ID="..."
PAYPAL_SECRET="..."
PAYPAL_WEBHOOK_ID="..."
NEXT_PUBLIC_PAYPAL_CLIENT_ID="..."  # Same as PAYPAL_CLIENT_ID
PAYPAL_MODE="sandbox"  # or "production"

# App URLs
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NEXT_PUBLIC_WEBSOCKET_URL="https://yourdomain.com"  # or separate WS server
WEBSOCKET_PORT="3001"
```

#### Optional
```bash
# Email (SendGrid)
SENDGRID_API_KEY="SG.xxx"
SENDGRID_FROM_EMAIL="noreply@yourdomain.com"

# Cron authentication
CRON_SECRET="random-secure-string"

# Monitoring (Sentry, etc.)
SENTRY_DSN="https://xxx@sentry.io/xxx"
```

### Environment Variable Security

**✅ DO**:
- Use `.env.local` for local development (gitignored)
- Use Vercel Environment Variables for production
- Use different credentials for dev/staging/production
- Rotate secrets regularly
- Use `NEXT_PUBLIC_` prefix only for client-side variables

**❌ DON'T**:
- Commit `.env` files with real credentials
- Expose server secrets to the client
- Use production credentials in development
- Share credentials in team chat or email

### `.env.example` Template
```bash
# .env.example - Safe to commit
# Copy to .env.local and fill in real values

# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# Redis
REDIS_URL="redis://localhost:6379"

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."

# PayPal (Sandbox)
PAYPAL_CLIENT_ID="sandbox_client_id"
PAYPAL_SECRET="sandbox_secret"
PAYPAL_WEBHOOK_ID="webhook_id"
NEXT_PUBLIC_PAYPAL_CLIENT_ID="sandbox_client_id"
PAYPAL_MODE="sandbox"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_WEBSOCKET_URL="http://localhost:3001"
WEBSOCKET_PORT="3001"
```

## Vercel Deployment

### Project Setup

1. **Connect GitHub Repository**
   ```bash
   # Push code to GitHub
   git remote add origin https://github.com/username/repo
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to https://vercel.com/new
   - Select GitHub repository
   - Configure settings:
     - Framework: Next.js
     - Root Directory: `./`
     - Build Command: `npm run build`
     - Output Directory: `.next`

3. **Add Environment Variables**
   - Settings → Environment Variables
   - Add all required variables
   - Separate values for Production, Preview, Development

### Deployment Configuration

#### `vercel.json`
```json
{
  "buildCommand": "prisma generate && next build",
  "crons": [
    {
      "path": "/api/cron/release-locks",
      "schedule": "*/2 * * * *"
    }
  ]
}
```

#### Build Settings
- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (or `prisma generate && next build`)
- **Output Directory**: `.next`
- **Install Command**: `npm install`
- **Development Command**: `npm run dev`

### Deployment Workflow

#### Automatic Deployments
```bash
# Production (main branch)
git push origin main
# → Deploys to production URL

# Preview (feature branches)
git push origin feature/new-feature
# → Creates preview deployment
```

#### Manual Deployments
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Environment-Specific URLs
- **Production**: `https://boosterhero.vercel.app` or custom domain
- **Preview**: `https://boosterhero-git-branch.vercel.app`
- **Development**: `http://localhost:3000`

## Database Management

### Neon PostgreSQL Setup

1. **Create Database**
   - Go to https://neon.tech
   - Create new project: "BoosterHero"
   - Copy connection string

2. **Connection String Format**
   ```
   postgresql://user:pass@host.neon.tech/db?sslmode=require&channel_binding=require
   ```

3. **Connection Pooling** (Recommended for serverless)
   ```
   # Use pooler endpoint for Vercel
   postgresql://user:pass@host-pooler.neon.tech:5432/db
   ```

### Prisma Migrations

#### Development Workflow
```bash
# Create migration
npx prisma migrate dev --name add_new_field

# Apply migrations
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate

# Reset database (destructive!)
npx prisma migrate reset
```

#### Production Workflow
```bash
# Option 1: Automatic (in build command)
# vercel.json: "buildCommand": "prisma generate && prisma migrate deploy && next build"

# Option 2: Manual (before deployment)
npx prisma migrate deploy

# Option 3: Via Vercel CLI
vercel env pull .env.production.local
npx prisma migrate deploy
```

#### Migration Best Practices
- **DO**: Test migrations in preview environment first
- **DO**: Backup database before running migrations in production
- **DO**: Use `prisma migrate deploy` for production (not `dev`)
- **DON'T**: Run migrations that delete data without backups
- **DON'T**: Use `prisma db push` in production

### Database Backups

#### Neon Backups
- **Automatic**: Point-in-time recovery (7 days retention on free tier)
- **Manual**: Use `pg_dump` for export

```bash
# Export database
pg_dump $DATABASE_URL > backup.sql

# Import database
psql $DATABASE_URL < backup.sql
```

## Redis Management (Upstash)

### Setup
1. Create database at https://console.upstash.com/
2. Copy connection string (starts with `rediss://`)
3. Add to Vercel environment variables

### Redis URL Format
```bash
# TLS enabled (production)
REDIS_URL="rediss://default:password@endpoint.upstash.io:6379"

# No TLS (local development - use local Redis)
REDIS_URL="redis://localhost:6379"
```

### Cache Management
```bash
# Clear all cache (via Redis CLI)
redis-cli -u $REDIS_URL FLUSHALL

# Clear specific keys
redis-cli -u $REDIS_URL DEL "campaign:*"

# Monitor Redis activity
redis-cli -u $REDIS_URL MONITOR
```

## Cron Jobs

### Vercel Cron Configuration

#### `vercel.json`
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

#### Cron Schedule Format
```
*    *    *    *    *
┬    ┬    ┬    ┬    ┬
│    │    │    │    └─ Day of Week (0-7, Sunday=0 or 7)
│    │    │    └────── Month (1-12)
│    │    └─────────── Day of Month (1-31)
│    └──────────────── Hour (0-23)
└───────────────────── Minute (0-59)
```

Examples:
- `*/2 * * * *` - Every 2 minutes
- `0 * * * *` - Every hour at minute 0
- `0 0 * * *` - Every day at midnight
- `0 9 * * 1` - Every Monday at 9 AM

### Alternative: External Cron Services

If not using Vercel Cron, use external service:

#### cron-job.org Setup
1. Go to https://cron-job.org
2. Create free account
3. Add new cron job:
   - URL: `https://yourdomain.com/api/cron/release-locks`
   - Schedule: Every 2 minutes
   - Headers: `Authorization: Bearer ${CRON_SECRET}`

#### GitHub Actions Cron
```yaml
# .github/workflows/cron.yml
name: Release Locks Cron

on:
  schedule:
    - cron: '*/2 * * * *'  # Every 2 minutes
  workflow_dispatch:  # Manual trigger

jobs:
  release-locks:
    runs-on: ubuntu-latest
    steps:
      - name: Call API endpoint
        run: |
          curl -X GET https://yourdomain.com/api/cron/release-locks \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

## Webhooks Configuration

### PayPal Webhooks Setup

1. **Go to PayPal Developer Dashboard**
   - https://developer.paypal.com/dashboard/
   - Apps & Credentials → Your App → Webhooks

2. **Add Webhook URL**
   - URL: `https://yourdomain.com/api/webhooks/paypal`
   - Events to subscribe:
     - `PAYMENT.CAPTURE.COMPLETED`
     - `PAYMENT.CAPTURE.DENIED`
     - `PAYMENT.CAPTURE.REFUNDED`

3. **Copy Webhook ID**
   - Add to environment variable: `PAYPAL_WEBHOOK_ID`

4. **Test Webhook**
   - Use PayPal's webhook simulator
   - Check logs in Vercel dashboard

### Webhook Security
```typescript
// Verify webhook signature
const isValid = await verifyWebhookSignature(headers, body)

if (!isValid) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
}

// Prevent duplicate processing
const existing = await db.webhookEvent.findUnique({
  where: { eventId: body.id },
})

if (existing) {
  return NextResponse.json({ received: true })
}
```

## Monitoring & Logging

### Vercel Logging

#### View Logs
- **Dashboard**: Project → Deployments → Function Logs
- **Real-time**: Use Vercel CLI
  ```bash
  vercel logs --follow
  vercel logs production
  ```

#### Log Best Practices
```typescript
// ✅ Structured logging
console.log('Payment processed:', {
  orderId: '123',
  amount: 100,
  timestamp: new Date().toISOString(),
})

// ✅ Error logging with context
console.error('Payment failed:', {
  orderId: '123',
  error: error.message,
  stack: error.stack,
})

// ❌ Don't log sensitive data
console.log('User password:', password)  // Never do this!
```

### Error Monitoring (Optional)

#### Sentry Integration
```bash
# Install
npm install @sentry/nextjs

# Initialize
npx @sentry/wizard@latest -i nextjs

# Configure
# sentry.client.config.ts
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
})
```

#### Custom Error Tracking
```typescript
// Report errors to monitoring service
try {
  await riskyOperation()
} catch (error) {
  console.error('Operation failed:', error)

  // Send to monitoring service
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error)
  }

  throw error
}
```

## Performance Optimization

### Build Optimization

#### `next.config.js`
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable compression
  compress: true,

  // Image optimization
  images: {
    domains: ['your-cdn.com'],
    formats: ['image/avif', 'image/webp'],
  },

  // Standalone output (smaller deployments)
  output: 'standalone',

  // Environment variables
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
}

module.exports = nextConfig
```

### Database Connection Pooling
```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
```

### Edge Runtime (Optional)
```typescript
// Use Edge runtime for faster cold starts
export const runtime = 'edge'

export async function GET(request: Request) {
  // Edge-compatible code only
  // No Node.js APIs, no Prisma
}
```

## Domain Configuration

### Custom Domain Setup

1. **Add Domain in Vercel**
   - Project Settings → Domains
   - Add `yourdomain.com` and `www.yourdomain.com`

2. **Configure DNS**
   - Type: A Record
   - Name: `@`
   - Value: `76.76.21.21`

   - Type: CNAME
   - Name: `www`
   - Value: `cname.vercel-dns.com`

3. **SSL Certificate**
   - Automatically provisioned by Vercel
   - Force HTTPS in settings

### Subdomain for API (Optional)
```
api.yourdomain.com → Vercel project
www.yourdomain.com → Vercel project (same)
```

## Git Workflow

### Branch Strategy
```bash
main           # Production (auto-deploys to Vercel)
└── develop    # Staging/Preview
    └── feature/xxx   # Feature branches
```

### Commit Conventions
```bash
# Feature
git commit -m "feat: add payment capture logic"

# Bug fix
git commit -m "fix: resolve cache invalidation issue"

# Docs
git commit -m "docs: update deployment guide"

# Refactor
git commit -m "refactor: extract payment service"

# Build/DevOps
git commit -m "build: update Prisma to 6.3.0"
```

### Deploy Workflow
```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Make changes and commit
git add .
git commit -m "feat: implement new feature"

# 3. Push to GitHub (creates preview deployment)
git push origin feature/new-feature

# 4. Test preview deployment
# https://boosterhero-git-feature-new-feature.vercel.app

# 5. Create PR and merge to main
# (Creates production deployment)
```

## Security Checklist

### Pre-Deployment Security

- [ ] All secrets in environment variables (not code)
- [ ] `.env` files in `.gitignore`
- [ ] Clerk middleware properly configured
- [ ] API routes have authentication checks
- [ ] Webhook signatures verified
- [ ] SQL injection prevention (using Prisma)
- [ ] XSS prevention (React escapes by default)
- [ ] CORS properly configured
- [ ] Rate limiting implemented (if needed)
- [ ] Input validation with Zod
- [ ] Error messages don't expose sensitive data
- [ ] HTTPS enforced
- [ ] Security headers configured

### Vercel Security Headers
```javascript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}
```

## Rollback Procedure

### Instant Rollback (Vercel)
1. Go to Project → Deployments
2. Find last working deployment
3. Click "..." → "Promote to Production"

### Git Rollback
```bash
# Revert last commit
git revert HEAD
git push origin main

# Reset to specific commit (destructive)
git reset --hard <commit-hash>
git push origin main --force  # Use with caution!
```

### Database Rollback
```bash
# If migration failed, rollback
npx prisma migrate resolve --rolled-back <migration-name>

# Restore from backup
psql $DATABASE_URL < backup.sql
```

## Troubleshooting

### Common Issues

**Build Fails**
```bash
# Check build logs
vercel logs <deployment-url>

# Test build locally
npm run build

# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

**Database Connection Errors**
```bash
# Check DATABASE_URL format
# Ensure connection pooling is enabled
# Verify IP allowlist (Neon allows all by default)

# Test connection
npx prisma db pull
```

**Environment Variables Not Working**
- Redeploy after adding new variables
- Check variable names (case-sensitive)
- Verify `NEXT_PUBLIC_` prefix for client variables
- Check environment scope (Production vs Preview)

**Cron Jobs Not Running**
- Verify `vercel.json` syntax
- Check function logs for errors
- Ensure endpoint returns 200 status
- Test endpoint manually with cURL

**Webhook Not Receiving Events**
- Verify webhook URL is accessible publicly
- Check PayPal dashboard for webhook status
- Test with PayPal webhook simulator
- Verify signature validation logic

## Deployment Checklist

### Pre-Production
- [ ] All environment variables configured
- [ ] Database migrations tested
- [ ] PayPal sandbox tested end-to-end
- [ ] Cron jobs configured and tested
- [ ] Webhook endpoints tested
- [ ] Custom domain configured
- [ ] SSL certificate active
- [ ] Error monitoring set up
- [ ] Backup strategy in place
- [ ] Load testing completed (if needed)

### Go Live
- [ ] Switch PayPal to production mode
- [ ] Update PayPal webhook URLs
- [ ] Test production payment flow
- [ ] Monitor error logs for 24 hours
- [ ] Verify cron jobs running
- [ ] Check database performance
- [ ] Verify email delivery (if applicable)
- [ ] Test from multiple devices/browsers

### Post-Production
- [ ] Set up regular backups
- [ ] Configure alerting
- [ ] Document deployment process
- [ ] Schedule performance reviews
- [ ] Plan scaling strategy
