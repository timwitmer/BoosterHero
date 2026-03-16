import { NextRequest, NextResponse } from 'next/server'
import { unlockSquares } from '@/services/gridService'

/**
 * POST /api/campaigns/[slug]/grid/unlock
 * Unlock squares (on payment cancel/failure)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lockToken } = body

    if (!lockToken) {
      return NextResponse.json(
        { error: 'Lock token required' },
        { status: 400 }
      )
    }

    await unlockSquares(lockToken)

    return NextResponse.json({
      success: true,
      message: 'Squares unlocked successfully',
    })
  } catch (error) {
    console.error('Unlock squares error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
