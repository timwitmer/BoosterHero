# GridGive - Digital Fundraising for Student Athletes

A modern, mobile-first web application for high school student-athletes to create personalized digital grid fundraisers.

## Project Overview

GridGive modernizes traditional scratch-off card fundraising with interactive digital grids. Athletes create campaigns, share via QR codes, and watch donations come in real-time as squares are purchased.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL 15+
- **Caching**: Redis (Upstash)
- **Authentication**: Clerk 6
- **Payments**: PayPal REST API (direct integration)
- **Real-time**: Socket.io 4.8
- **Email**: SendGrid
- **Hosting**: Vercel

**Latest Updates (2026-03-16):**
- ✅ Updated to Next.js 15 with Turbopack
- ✅ Upgraded to React 19
- ✅ Migrated from deprecated PayPal SDK to REST API
- ✅ Updated all dependencies to latest stable versions
- ✅ See [DEPENDENCIES_UPDATED.md](./DEPENDENCIES_UPDATED.md) for details

## Getting Started

### Prerequisites

- Node.js 20+ LTS
- PostgreSQL 15+
- Redis
- Clerk account (for authentication)
- PayPal Developer account (for payments)
- SendGrid account (for emails)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd BoosterHero
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Fill in your environment variables:
   - `DATABASE_URL`: PostgreSQL connection string
   - `REDIS_URL`: Redis connection string
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` & `CLERK_SECRET_KEY`: From Clerk dashboard
   - `PAYPAL_CLIENT_ID` & `PAYPAL_SECRET`: From PayPal Developer
   - `SENDGRID_API_KEY`: From SendGrid

4. **Initialize the database**
   ```bash
   npm run db:push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Start the WebSocket server** (in a separate terminal)
   ```bash
   npm run websocket
   ```

7. **Open your browser**
   Navigate to `http://localhost:3000`

## Project Structure

```
boosterhero/
├── prisma/
│   └── schema.prisma          # Database schema
├── src/
│   ├── app/                   # Next.js app directory
│   │   ├── api/              # API routes
│   │   ├── (auth)/           # Auth pages
│   │   ├── (dashboard)/      # Dashboard pages
│   │   ├── give/             # Public campaign pages
│   │   └── layout.tsx        # Root layout
│   ├── components/
│   │   ├── ui/               # Reusable UI components
│   │   ├── grid/             # Grid components
│   │   ├── payment/          # Payment components
│   │   └── campaign/         # Campaign components
│   ├── lib/
│   │   ├── db.ts             # Prisma client
│   │   ├── redis.ts          # Redis client
│   │   ├── paypal.ts         # PayPal integration
│   │   ├── utils.ts          # Utility functions
│   │   └── validations.ts    # Zod schemas
│   ├── services/
│   │   └── gridService.ts    # Grid business logic
│   └── types/
│       └── index.ts          # TypeScript types
├── server/
│   └── websocket.ts          # WebSocket server
└── package.json
```

## Key Features

### Phase 1 (MVP) - Current Status
- [x] Project setup and configuration
- [x] Database schema with Prisma
- [x] Core services (grid, payment)
- [x] Basic UI components
- [x] **PayPal integration (COMPLETE)** ✨
  - [x] Lock squares API with optimistic locking
  - [x] Create/capture order endpoints
  - [x] Webhook handler with idempotency
  - [x] PayPal Smart Payment Buttons component
  - [x] Checkout modal with donor info
  - [x] Payment status polling
- [x] **Grid rendering component (COMPLETE)** ✨
  - [x] SVG-based grid visualization
  - [x] Interactive square selection (multi-select)
  - [x] Visual states (available/pending/sold)
  - [x] GridStats component with progress tracking
  - [x] Responsive design (mobile-first)
  - [x] Real-time update integration (WebSocket ready)
  - [x] Complete campaign page example
- [x] **User authentication (COMPLETE)** ✨
  - [x] Clerk integration with sign-up/sign-in pages
  - [x] Protected routes with middleware
  - [x] User creation in database
- [x] **Campaign CRUD (COMPLETE)** ✨
  - [x] Create campaign form
  - [x] Campaign listing page
  - [x] Campaign detail/management page
  - [x] Auto-generate unique slugs
  - [x] Auto-initialize grid on creation
- [x] **WebSocket server (COMPLETE)** ✨
  - [x] Socket.io server with room management
  - [x] Real-time grid update broadcasting
  - [x] Connection tracking
  - [x] HTTP API for broadcasting from webhooks
  - [x] Integrated with payment webhook

### Phase 2 (Polish)
- [x] **Campaign activation (COMPLETE)** ✨
  - [x] Activate/pause campaigns
  - [x] Status management with validation
  - [x] Prevent donations on non-active campaigns
- [x] **QR code generation (COMPLETE)** ✨
  - [x] Generate QR codes for campaign URLs
  - [x] Download high-res PNG (1024x1024)
  - [x] Live preview in campaign dashboard
  - [x] Copy/share campaign links
  - [x] Native share API integration
- [ ] Transactional emails
- [ ] Campaign statistics
- [ ] Notifications

### Phase 3 (Scale)
- [ ] Admin dashboard
- [ ] Multi-sport graphics
- [ ] Theme customization
- [ ] Analytics and reporting

## Development

### Database Commands

```bash
# Generate Prisma Client
npm run db:generate

# Push schema changes to database
npm run db:push

# Create a migration
npm run db:migrate

# Open Prisma Studio
npm run db:studio
```

### Running Tests

```bash
# Run unit tests
npm test

# Run e2e tests
npm run test:e2e
```

### Building for Production

```bash
npm run build
npm run start
```

## Architecture Highlights

### Concurrency Control

The system prevents race conditions when multiple donors try to purchase the same square:

1. **Optimistic Locking**: Version numbers on grid squares
2. **Database Constraints**: Unique constraints on purchased squares
3. **Lock Expiration**: Automatic cleanup after 5 minutes
4. **Idempotent Webhooks**: Prevents duplicate processing

### Payment Flow

1. Donor selects squares → API locks them
2. Frontend creates PayPal order
3. Donor completes payment
4. PayPal webhook confirms payment
5. Backend updates squares to "sold"
6. WebSocket broadcasts to all viewers

### Real-Time Updates

- **Primary**: WebSocket (Socket.io) for instant updates
- **Fallback**: Short polling every 5 seconds
- **Caching**: Redis caches grid state (60s TTL)

## Security

- JWT tokens in httpOnly cookies
- PayPal webhook signature verification
- Input validation with Zod
- Rate limiting on API endpoints
- HTTPS only in production
- Never store credit card data

## Contributing

1. Create a feature branch
2. Make your changes
3. Write tests
4. Submit a pull request

## License

Private - All rights reserved

## Support

For support, email support@gridgive.com

---

## Payment Integration 💳

**Status: COMPLETE** ✅

The full payment flow with PayPal is now implemented! See detailed documentation:

- **Quick Start**: [PAYMENT_QUICK_START.md](./PAYMENT_QUICK_START.md) - Get testing in 5 minutes
- **Full Documentation**: [PAYMENT_INTEGRATION.md](./PAYMENT_INTEGRATION.md) - Architecture & testing guide
- **Test Script**: `npx tsx scripts/test-payment-flow.ts` - Automated testing
- **Webhook Simulator**: `npx tsx scripts/simulate-webhook.ts <orderId>` - Local testing

### Key Features Implemented:
- ✅ Multi-layer concurrency control (prevents race conditions)
- ✅ Optimistic locking with version numbers
- ✅ Idempotent webhook processing
- ✅ 5-minute lock expiration
- ✅ PayPal Smart Payment Buttons
- ✅ Payment status tracking
- ✅ Automatic cache invalidation

### Quick Test:
```bash
# 1. Set PayPal credentials in .env
# 2. Start app
npm run dev

# 3. In another terminal, run test
npx tsx scripts/test-payment-flow.ts
```

---

**Next Steps:**
1. Set up Clerk authentication
2. Build campaign CRUD endpoints
3. Implement grid rendering component
4. Add WebSocket real-time updates
5. QR code generation

See the full implementation plan in `.claude/plans/` directory.
