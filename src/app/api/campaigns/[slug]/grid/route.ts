import { NextRequest, NextResponse } from 'next/server'
import { getGridState } from '@/services/gridService'

/**
 * GET /api/campaigns/:slug/grid
 * Get grid state with squares and statistics
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    // Fetch grid state (with caching)
    const squares = await getGridState(slug)

    // Calculate statistics
    let soldCount = 0
    let availableCount = 0
    let pendingCount = 0
    let totalRaised = 0
    const donors = new Set<string>()

    squares.forEach(square => {
      if (square.status === 'sold') {
        soldCount++
        totalRaised += parseFloat(square.squareValue)
        if (square.donorName) {
          donors.add(square.donorName)
        }
      } else if (square.status === 'available') {
        availableCount++
      } else if (square.status === 'pending') {
        pendingCount++
      }
    })

    const totalSquares = squares.length
    const completionPercentage = totalSquares > 0
      ? Math.round((soldCount / totalSquares) * 100)
      : 0

    // Find last donation time
    // Note: This would ideally come from transactions table for accuracy
    // For now, we'll omit it and add it in a future enhancement

    return NextResponse.json({
      success: true,
      squares,
      stats: {
        totalSquares,
        squaresSold: soldCount,
        squaresAvailable: availableCount,
        squaresPending: pendingCount,
        totalRaised,
        totalDonors: donors.size,
        completionPercentage,
      },
    })
  } catch (error: any) {
    console.error('Get grid error:', error)

    if (error.message === 'Campaign not found') {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
