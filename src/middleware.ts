import { clerkMiddleware } from '@clerk/nextjs/server'

// Clerk middleware - individual routes will check auth as needed
// Public routes are unrestricted, protected routes check auth in pages/API routes
export default clerkMiddleware()

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}
