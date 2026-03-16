import { db } from '@/lib/db'
import { redis, CACHE_KEYS, CACHE_TTL } from '@/lib/redis'
import { Prisma } from '@prisma/client'

export interface GridSquare {
  id: string
  positionX: number
  positionY: number
  squareValue: string
  status: string
  donorName?: string
  donorInitials?: string
}

export interface LockSquaresResult {
  success: boolean
  lockedSquares: GridSquare[]
  failedSquares: string[]
  lockToken: string
  totalAmount: string
}

/**
 * Get grid state for a campaign (with caching)
 */
export async function getGridState(campaignSlug: string): Promise<GridSquare[]> {
  // Try cache first (optional - gracefully handle Redis errors)
  try {
    const cacheKey = CACHE_KEYS.grid(campaignSlug)
    const cached = await redis.get(cacheKey)

    if (cached) {
      return JSON.parse(cached)
    }
  } catch (error) {
    // Redis not available, continue without cache
    console.log('Redis cache miss or unavailable, fetching from database')
  }

  // Fetch from database
  const campaign = await db.campaign.findUnique({
    where: { slug: campaignSlug },
    include: {
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

  if (!campaign) {
    throw new Error('Campaign not found')
  }

  const gridSquares: GridSquare[] = campaign.gridSquares.map((square) => ({
    id: square.id,
    positionX: square.positionX,
    positionY: square.positionY,
    squareValue: square.squareValue.toString(),
    status: square.status,
    donorName: square.purchasedSquares[0]?.donorName,
    donorInitials: square.purchasedSquares[0]?.donorInitials ?? undefined,
  }))

  // Cache for future requests (optional)
  try {
    const cacheKey = CACHE_KEYS.grid(campaignSlug)
    await redis.setex(cacheKey, CACHE_TTL.grid, JSON.stringify(gridSquares))
  } catch (error) {
    // Redis not available, continue without cache
    console.log('Redis unavailable, skipping cache')
  }

  return gridSquares
}

/**
 * Lock squares for purchase (optimistic locking)
 */
export async function lockSquares(
  campaignSlug: string,
  squareIds: string[],
  lockToken: string
): Promise<LockSquaresResult> {
  const lockedUntil = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now

  const lockedSquares: GridSquare[] = []
  const failedSquares: string[] = []
  let totalAmount = 0

  try {
    await db.$transaction(async (tx) => {
      // Verify campaign exists
      const campaign = await tx.campaign.findUnique({
        where: { slug: campaignSlug },
      })

      if (!campaign) {
        throw new Error('Campaign not found')
      }

      if (campaign.status !== 'active') {
        throw new Error('Campaign is not active')
      }

      // Fetch all squares at once for better performance
      const squares = await tx.gridSquare.findMany({
        where: {
          id: { in: squareIds },
          campaignId: campaign.id,
        },
      })

      // Create a map for quick lookup
      const squareMap = new Map(squares.map(s => [s.id, s]))

      // Attempt to lock each square
      for (const squareId of squareIds) {
        const square = squareMap.get(squareId)

        if (!square) {
          failedSquares.push(squareId)
          continue
        }

        // Check if square is available
        if (square.status !== 'available') {
          failedSquares.push(squareId)
          continue
        }

        // Attempt optimistic lock with version check
        try {
          const updated = await tx.gridSquare.updateMany({
            where: {
              id: squareId,
              status: 'available',
              version: square.version, // Optimistic lock check
            },
            data: {
              status: 'pending',
              lockedUntil,
              version: { increment: 1 },
            },
          })

          if (updated.count === 0) {
            // Version mismatch - square was already locked by another transaction
            failedSquares.push(squareId)
            continue
          }

          // Successfully locked
          lockedSquares.push({
            id: square.id,
            positionX: square.positionX,
            positionY: square.positionY,
            squareValue: square.squareValue.toString(),
            status: 'pending',
          })

          totalAmount += parseFloat(square.squareValue.toString())
        } catch (error) {
          failedSquares.push(squareId)
        }
      }

      // If no squares were locked, abort
      if (lockedSquares.length === 0) {
        throw new Error('No squares could be locked')
      }

      // Store lock info in Redis (optional)
      const lockData = {
        campaignId: campaign.id,
        campaignSlug: campaign.slug,
        squareIds: lockedSquares.map(s => s.id),
        totalAmount: totalAmount.toFixed(2),
        lockedUntil: lockedUntil.toISOString(),
      }
      try {
        await redis.setex(
          CACHE_KEYS.lock(lockToken),
          CACHE_TTL.lock,
          JSON.stringify(lockData)
        )
      } catch (error) {
        console.log('Redis unavailable, lock info not cached')
      }
    })

    // Invalidate grid cache (optional)
    try {
      await redis.del(CACHE_KEYS.grid(campaignSlug))
    } catch (error) {
      console.log('Redis unavailable, cache not invalidated')
    }

    return {
      success: true,
      lockedSquares,
      failedSquares,
      lockToken,
      totalAmount: totalAmount.toFixed(2),
    }
  } catch (error) {
    console.error('Lock squares error:', error)
    throw error
  }
}

/**
 * Unlock squares (on payment cancellation or failure)
 */
export async function unlockSquares(lockToken: string): Promise<void> {
  try {
    // Get lock data from Redis
    const lockData = await redis.get(CACHE_KEYS.lock(lockToken))
    if (!lockData) {
      return // Lock already expired or doesn't exist
    }

    const { squareIds, campaignSlug } = JSON.parse(lockData)

    // Unlock squares in database
    await db.gridSquare.updateMany({
      where: {
        id: { in: squareIds },
        status: 'pending',
      },
      data: {
        status: 'available',
        lockedUntil: null,
      },
    })

    // Delete lock from Redis
    await redis.del(CACHE_KEYS.lock(lockToken))

    // Invalidate grid cache
    await redis.del(CACHE_KEYS.grid(campaignSlug))
  } catch (error) {
    console.error('Unlock squares error:', error)
    throw error
  }
}

/**
 * Mark squares as sold (after successful payment)
 */
export async function markSquaresAsSold(
  squareIds: string[],
  transactionId: string,
  donorName: string
): Promise<void> {
  try {
    await db.$transaction(async (tx) => {
      // Update square status
      await tx.gridSquare.updateMany({
        where: {
          id: { in: squareIds },
          status: 'pending',
        },
        data: {
          status: 'sold',
          lockedUntil: null,
        },
      })

      // Create purchased_squares records
      const donorInitials = donorName
        .split(' ')
        .map(part => part[0])
        .join('')
        .toUpperCase()
        .slice(0, 3)

      for (const squareId of squareIds) {
        await tx.purchasedSquare.create({
          data: {
            transactionId,
            squareId,
            donorName,
            donorInitials,
          },
        })
      }
    })

    // Invalidate caches (will be done in webhook handler for campaignSlug)
  } catch (error) {
    console.error('Mark squares as sold error:', error)
    throw error
  }
}

/**
 * Release expired locks (background job)
 */
export async function releaseExpiredLocks(): Promise<number> {
  try {
    const result = await db.gridSquare.updateMany({
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

    return result.count
  } catch (error) {
    console.error('Release expired locks error:', error)
    return 0
  }
}

/**
 * Initialize grid for a new campaign
 */
export async function initializeGrid(
  campaignId: string,
  rows: number,
  cols: number,
  squareValue: number
): Promise<void> {
  const squares: Prisma.GridSquareCreateManyInput[] = []

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      squares.push({
        campaignId,
        positionX: x,
        positionY: y,
        squareValue,
        status: 'available',
      })
    }
  }

  await db.gridSquare.createMany({
    data: squares,
  })
}

/**
 * Get lock info from token
 */
export async function getLockInfo(lockToken: string): Promise<any | null> {
  try {
    const lockData = await redis.get(CACHE_KEYS.lock(lockToken))
    return lockData ? JSON.parse(lockData) : null
  } catch (error) {
    console.error('Redis error in getLockInfo:', error)
    return null
  }
}
