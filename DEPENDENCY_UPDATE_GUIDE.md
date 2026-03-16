# Dependency Update Guide

## Overview

This guide covers the major dependency updates from deprecated/outdated packages to their latest stable versions.

## Major Updates

### 1. Next.js 14.1.0 → 15.1.6
- **Breaking Changes:**
  - React 19 is now required
  - `next/font` is now `next/font/google`
  - Some middleware API changes
  - Turbopack is now stable (optional)

### 2. React 18.2.0 → 19.0.0
- **Breaking Changes:**
  - `useFormState` renamed to `useActionState`
  - `ref` is now a regular prop (no more `forwardRef` needed)
  - `defaultProps` deprecated for function components
  - Server Components are now the default

### 3. Clerk 5.0.0 → 6.5.2
- **Changes:**
  - Improved TypeScript types
  - Better middleware integration
  - Enhanced security features
  - No breaking changes from 5.x to 6.x (semver)

### 4. Prisma 5.10.0 → 6.3.0
- **Changes:**
  - Performance improvements
  - Better TypeScript support
  - Enhanced query engine
  - Potential migration needed (see below)

### 5. PayPal SDK → REST API
- **Breaking Change:**
  - Removed `@paypal/checkout-server-sdk` (deprecated)
  - Now using PayPal REST API directly with `fetch`
  - **NO CODE CHANGES NEEDED** - Interface remains the same
  - Better performance and security

### 6. date-fns 3.3.1 → 4.1.0
- **Breaking Changes:**
  - Some function signatures changed
  - Better TypeScript support
  - Review date formatting code

### 7. Zustand 4.5.1 → 5.0.2
- **Breaking Changes:**
  - Better TypeScript inference
  - Some middleware API changes
  - Check store implementations

## Update Steps

### Step 1: Backup Current State

```bash
# Commit all changes
git add .
git commit -m "Pre-dependency update checkpoint"

# Create backup branch
git branch backup-before-update
```

### Step 2: Update Dependencies

```bash
# Remove old dependencies
rm -rf node_modules package-lock.json

# Install new dependencies
npm install
```

### Step 3: Update Prisma

```bash
# Regenerate Prisma client with new version
npm run db:generate

# Check for schema changes needed
npm run db:push
```

### Step 4: Fix Breaking Changes

#### React 19 Changes

**Before (React 18):**
```typescript
import { forwardRef } from 'react'

const Component = forwardRef<HTMLDivElement, Props>((props, ref) => {
  return <div ref={ref}>{props.children}</div>
})
```

**After (React 19):**
```typescript
// ref is now a regular prop - no forwardRef needed
const Component = ({ ref, children }: Props & { ref?: React.Ref<HTMLDivElement> }) => {
  return <div ref={ref}>{children}</div>
}
```

#### Next.js 15 Changes

**Update middleware if needed:**
```typescript
// middleware.ts - Already updated to use Clerk v5+ pattern
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher(['/'])

export default clerkMiddleware((auth, request) => {
  if (!isPublicRoute(request)) {
    auth().protect()
  }
})
```

#### date-fns 4.x Changes

**Check date formatting:**
```typescript
// Most common functions work the same
import { format, parseISO } from 'date-fns'

// If you see errors, check migration guide:
// https://github.com/date-fns/date-fns/blob/main/CHANGELOG.md
```

### Step 5: Test Everything

```bash
# Run type checking
npm run build

# Start dev server
npm run dev

# Test critical paths:
# 1. User authentication (sign in/sign up)
# 2. Campaign creation
# 3. Grid rendering and selection
# 4. Payment flow (test with PayPal sandbox)
# 5. WebSocket real-time updates
# 6. QR code generation
```

### Step 6: Test PayPal Integration

The PayPal SDK has been replaced with direct REST API calls. Test thoroughly:

```bash
# 1. Create a test campaign
# 2. Activate the campaign
# 3. Try purchasing squares
# 4. Verify payment completes
# 5. Check webhook processing
# 6. Verify real-time updates work
```

**What Changed in PayPal:**
- ✅ All function signatures remain the same
- ✅ Same parameters and return types
- ✅ Better error handling
- ✅ No more deprecated SDK warnings
- ✅ More reliable (fewer dependency conflicts)

### Step 7: Database Migration (Prisma 6)

```bash
# Check if migration is needed
npm run db:push

# If there are issues, create a migration
npm run db:migrate

# Verify in Prisma Studio
npm run db:studio
```

## Known Issues & Solutions

### Issue 1: React 19 Type Errors

**Error:**
```
Type 'ForwardRefExoticComponent' is not assignable to type 'FC'
```

**Solution:**
Remove `forwardRef` and make `ref` a regular prop:
```typescript
// Old
const Button = forwardRef<HTMLButtonElement, Props>((props, ref) => ...)

// New
const Button = ({ ref, ...props }: Props & { ref?: Ref<HTMLButtonElement> }) => ...
```

### Issue 2: Next.js 15 Build Errors

**Error:**
```
Module not found: Can't resolve 'next/font'
```

**Solution:**
Already using `next/font/google` - no changes needed.

### Issue 3: Prisma Client Errors

**Error:**
```
@prisma/client did not initialize yet
```

**Solution:**
```bash
npm run db:generate
npm run dev
```

### Issue 4: ESLint 9.x Errors

**Error:**
```
ESLint configuration error
```

**Solution:**
ESLint 9 uses flat config. If you have custom ESLint rules, update to flat config:
```javascript
// eslint.config.js (new format)
export default [
  {
    ignores: ['.next/**', 'node_modules/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    // ... rules
  },
]
```

## Compatibility Matrix

| Package | Old Version | New Version | Breaking? |
|---------|-------------|-------------|-----------|
| Next.js | 14.1.0 | 15.1.6 | Yes |
| React | 18.2.0 | 19.0.0 | Yes |
| Clerk | 5.0.0 | 6.5.2 | No |
| Prisma | 5.10.0 | 6.3.0 | Minor |
| PayPal SDK | 1.0.3 | (Removed) | No* |
| date-fns | 3.3.1 | 4.1.0 | Minor |
| Zustand | 4.5.1 | 5.0.2 | Minor |
| Socket.io | 4.6.1 | 4.8.1 | No |

*PayPal SDK removed but interface unchanged

## Rollback Plan

If updates cause issues:

```bash
# Restore from backup
git checkout backup-before-update

# Reinstall old dependencies
npm install

# Regenerate Prisma
npm run db:generate

# Start server
npm run dev
```

## Testing Checklist

- [ ] Application builds without errors (`npm run build`)
- [ ] Dev server starts (`npm run dev`)
- [ ] TypeScript compiles without errors
- [ ] Sign in/sign up works
- [ ] Create campaign works
- [ ] Grid renders correctly
- [ ] Square selection works
- [ ] PayPal payment flow works
- [ ] Webhook processing works
- [ ] Real-time updates work
- [ ] QR code generation works
- [ ] Campaign activation works
- [ ] WebSocket server works

## Performance Improvements

After updating, you should see:

✅ **Faster Build Times** - Next.js 15 with Turbopack
✅ **Faster PayPal API** - Direct REST calls (no SDK overhead)
✅ **Better TypeScript** - React 19 and Prisma 6 have improved types
✅ **Smaller Bundle** - React 19 is smaller and faster
✅ **Better Dev Experience** - Faster hot reload

## Support

If you encounter issues:

1. **Check error messages** - Often have clear solutions
2. **Review migration guides** - Links in this document
3. **Test in isolation** - Disable features one by one
4. **Rollback if needed** - Use backup branch

## Additional Resources

- [Next.js 15 Upgrade Guide](https://nextjs.org/docs/app/building-your-application/upgrading)
- [React 19 Upgrade Guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [Prisma 6 Migration](https://www.prisma.io/docs/guides/upgrade-guides)
- [PayPal REST API Docs](https://developer.paypal.com/docs/api/overview/)
- [date-fns v4 Changes](https://github.com/date-fns/date-fns/blob/main/CHANGELOG.md)

---

**Last Updated:** 2026-03-16
**Status:** Ready for testing
