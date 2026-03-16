import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/paypal'
import { db } from '@/lib/db'
import { markSquaresAsSold, getGridState } from '@/services/gridService'
import { redis, CACHE_KEYS } from '@/lib/redis'
import { broadcastGridUpdate } from '@/lib/websocket-client'

/**
 * POST /api/webhooks/paypal
 * Handle PayPal webhook events
 *
 * CRITICAL: This endpoint must be idempotent - PayPal may retry webhooks
 */
export async function POST(request: NextRequest) {
  let eventId: string | undefined
  try {
    const body = await request.json()

    // Extract headers for signature verification
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key] = value
    })

    // Verify webhook signature (security check)
    const isValid = await verifyWebhookSignature(headers, body)
    if (!isValid) {
      console.error('Invalid webhook signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    const eventType = body.event_type
    eventId = body.id
    const resource = body.resource

    console.log(`PayPal webhook received: ${eventType} (${eventId})`)

    // Check if we've already processed this webhook (idempotency)
    const existingEvent = await db.webhookEvent.findUnique({
      where: { eventId },
    })

    if (existingEvent) {
      if (existingEvent.status === 'processed') {
        console.log(`Webhook ${eventId} already processed, returning 200`)
        return NextResponse.json({
          success: true,
          message: 'Webhook already processed',
        })
      }

      if (existingEvent.status === 'processing') {
        console.log(`Webhook ${eventId} currently processing, returning 200`)
        return NextResponse.json({
          success: true,
          message: 'Webhook is being processed',
        })
      }

      // If failed, we'll retry below
    } else {
      // Create webhook event record
      await db.webhookEvent.create({
        data: {
          provider: 'paypal',
          eventType,
          eventId: eventId!, // Non-null assertion - eventId is set from body.id above
          payload: body,
          status: 'processing',
        },
      })
    }

    // Handle different event types
    switch (eventType) {
      case 'PAYMENT.CAPTURE.COMPLETED':
        await handlePaymentCaptureCompleted(eventId!, resource)
        break

      case 'PAYMENT.CAPTURE.DENIED':
      case 'PAYMENT.CAPTURE.DECLINED':
        await handlePaymentCaptureFailed(eventId!, resource)
        break

      case 'PAYMENT.CAPTURE.REFUNDED':
        await handlePaymentCaptureRefunded(eventId!, resource)
        break

      default:
        console.log(`Unhandled webhook event type: ${eventType}`)
        await db.webhookEvent.update({
          where: { eventId: eventId! },
          data: {
            status: 'processed',
            processedAt: new Date(),
          },
        })
    }

    return NextResponse.json({
      success: true,
      message: 'Webhook processed successfully',
    })
  } catch (error: any) {
    console.error('Webhook processing error:', error)

    // Update webhook event status
    if (eventId) {
      try {
        await db.webhookEvent.update({
          where: { eventId },
          data: {
            status: 'failed',
            errorMessage: error.message,
            retryCount: { increment: 1 },
          },
        })
      } catch (updateError) {
        console.error('Failed to update webhook event:', updateError)
      }
    }

    // Return 500 so PayPal retries
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle successful payment capture
 */
async function handlePaymentCaptureCompleted(
  eventId: string,
  resource: any
) {
  const captureId = resource.id
  const orderId = resource.supplementary_data?.related_ids?.order_id

  if (!orderId) {
    throw new Error('Order ID not found in webhook payload')
  }

  try {
    let campaignSlug: string | undefined

    await db.$transaction(async (tx) => {
      // Find transaction by PayPal order ID
      const transaction = await tx.transaction.findUnique({
        where: { paypalOrderId: orderId },
        include: { campaign: true },
      })

      if (!transaction) {
        throw new Error(`Transaction not found for order ${orderId}`)
      }

      // Save campaign slug for use outside transaction
      campaignSlug = transaction.campaign.slug

      // Check if already completed (idempotency)
      if (transaction.status === 'completed') {
        console.log(`Transaction ${transaction.id} already completed`)
        return
      }

      // Extract square IDs from metadata
      const metadata = transaction.metadata as any
      const squareIds = metadata?.squareIds || []

      if (squareIds.length === 0) {
        throw new Error('No square IDs found in transaction metadata')
      }

      // Update transaction status
      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'completed',
          paypalCaptureId: captureId,
          completedAt: new Date(),
          feeAmount: resource.seller_receivable_breakdown?.paypal_fee?.value || '0',
          netAmount: resource.seller_receivable_breakdown?.net_amount?.value || resource.amount?.value,
          metadata: {
            ...metadata,
            captureResource: resource,
          },
        },
      })

      // Mark squares as sold
      await markSquaresAsSold(
        squareIds,
        transaction.id,
        transaction.donorName
      )

      // Invalidate caches
      try {
        await redis.del(CACHE_KEYS.grid(transaction.campaign.slug))
        await redis.del(CACHE_KEYS.stats(transaction.campaign.slug))
        await redis.del(CACHE_KEYS.campaign(transaction.campaign.slug))
      } catch (error) {
        console.log('Redis unavailable, skipping cache invalidation')
      }

      // Delete lock token from Redis
      const lockToken = metadata?.lockToken
      if (lockToken) {
        try {
          await redis.del(CACHE_KEYS.lock(lockToken))
        } catch (error) {
          console.log('Redis unavailable, skipping lock deletion')
        }
      }

      console.log(`Transaction ${transaction.id} completed successfully`)
    })

    // Broadcast WebSocket event to all viewers (outside transaction)
    if (campaignSlug) {
      try {
        const updatedSquares = await getGridState(campaignSlug)
        await broadcastGridUpdate(campaignSlug, updatedSquares)
        console.log(`✅ Broadcasted grid update for ${campaignSlug}`)
      } catch (error) {
        console.error('Failed to broadcast WebSocket event:', error)
        // Don't fail the webhook if broadcasting fails
      }
    }

    // TODO: Queue email notifications
    // - Donor: Purchase confirmation with receipt
    // - Athlete: New donation alert

    // Update webhook event to processed
    await db.webhookEvent.update({
      where: { eventId: eventId! },
      data: {
        status: 'processed',
        processedAt: new Date(),
      },
    })
  } catch (error: any) {
    console.error('Payment capture completion error:', error)
    throw error
  }
}

/**
 * Handle failed payment capture
 */
async function handlePaymentCaptureFailed(
  eventId: string,
  resource: any
) {
  const orderId = resource.supplementary_data?.related_ids?.order_id

  if (!orderId) {
    console.log('Order ID not found in failed capture webhook')
    await db.webhookEvent.update({
      where: { eventId },
      data: {
        status: 'processed',
        processedAt: new Date(),
      },
    })
    return
  }

  try {
    await db.$transaction(async (tx) => {
      const transaction = await tx.transaction.findUnique({
        where: { paypalOrderId: orderId },
      })

      if (!transaction) {
        console.log(`Transaction not found for failed order ${orderId}`)
        return
      }

      // Update transaction to failed
      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'failed',
          failureReason: resource.status_details?.reason || 'Payment capture failed',
          metadata: {
            ...(transaction.metadata as any),
            failureResource: resource,
          },
        },
      })

      // Unlock squares
      const metadata = transaction.metadata as any
      const lockToken = metadata?.lockToken

      if (lockToken) {
        // Squares will be unlocked by expiration mechanism
        // or we can unlock them immediately here
        const squareIds = metadata?.squareIds || []
        if (squareIds.length > 0) {
          await tx.gridSquare.updateMany({
            where: {
              id: { in: squareIds },
              status: 'pending',
            },
            data: {
              status: 'available',
              lockedUntil: null,
            },
          })
        }

        await redis.del(CACHE_KEYS.lock(lockToken))
      }

      console.log(`Transaction ${transaction.id} marked as failed`)
    })

    await db.webhookEvent.update({
      where: { eventId },
      data: {
        status: 'processed',
        processedAt: new Date(),
      },
    })
  } catch (error: any) {
    console.error('Payment failure handling error:', error)
    throw error
  }
}

/**
 * Handle payment refund
 */
async function handlePaymentCaptureRefunded(
  eventId: string,
  resource: any
) {
  const captureId = resource.id

  try {
    await db.$transaction(async (tx) => {
      // Find transaction by capture ID
      const transaction = await tx.transaction.findFirst({
        where: { paypalCaptureId: captureId },
      })

      if (!transaction) {
        console.log(`Transaction not found for refunded capture ${captureId}`)
        return
      }

      // Update transaction to refunded
      await tx.transaction.update({
        where: { id: transaction.id },
        data: {
          status: 'refunded',
          metadata: {
            ...(transaction.metadata as any),
            refundResource: resource,
          },
        },
      })

      // Note: Squares remain sold - admin can manually handle square reassignment

      console.log(`Transaction ${transaction.id} refunded`)
    })

    await db.webhookEvent.update({
      where: { eventId },
      data: {
        status: 'processed',
        processedAt: new Date(),
      },
    })
  } catch (error: any) {
    console.error('Payment refund handling error:', error)
    throw error
  }
}
