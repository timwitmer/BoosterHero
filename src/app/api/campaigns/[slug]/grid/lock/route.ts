import { NextRequest, NextResponse } from 'next/server'
import { lockSquares } from '@/services/gridService'
import { lockSquaresSchema } from '@/lib/validations'
import { randomBytes } from 'crypto'

/**
 * POST /api/campaigns/[slug]/grid/lock
 * Lock squares for purchase attempt
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
    const body = await request.json()

    // Validate input
    const validation = lockSquaresSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { squareIds } = validation.data

    // Generate unique lock token
    const lockToken = randomBytes(32).toString('hex')

    // Lock squares with optimistic locking
    const result = await lockSquares(slug, squareIds, lockToken)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to lock squares', details: result },
        { status: 409 }
      )
    }

    return NextResponse.json({
      success: true,
      lockToken: result.lockToken,
      lockedSquares: result.lockedSquares,
      failedSquares: result.failedSquares,
      totalAmount: result.totalAmount,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })
  } catch (error: any) {
    console.error('Lock squares error:', error)

    if (error.message === 'Campaign not found') {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    if (error.message === 'Campaign is not active') {
      return NextResponse.json(
        { error: 'Campaign is not active' },
        { status: 400 }
      )
    }

    if (error.message === 'No squares could be locked') {
      return NextResponse.json(
        { error: 'All selected squares are no longer available' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
