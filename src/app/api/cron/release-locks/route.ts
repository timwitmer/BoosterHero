import { NextRequest, NextResponse } from 'next/server'
import { releaseExpiredLocks } from '@/services/gridService'

/**
 * GET /api/cron/release-locks
 * Release expired square locks (background job)
 *
 * This endpoint should be called periodically by a cron service
 * like Vercel Cron, GitHub Actions, or external cron-job.org
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication for production
    // const authHeader = request.headers.get('authorization')
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    console.log('Running expired locks cleanup...')
    const releasedCount = await releaseExpiredLocks()

    return NextResponse.json({
      success: true,
      message: `Released ${releasedCount} expired locks`,
      releasedCount,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Release locks cron error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to release locks',
        message: error.message
      },
      { status: 500 }
    )
  }
}
