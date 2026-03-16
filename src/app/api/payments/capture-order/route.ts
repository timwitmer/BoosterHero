import { NextRequest, NextResponse } from 'next/server'
import { captureOrder as capturePayPalOrder } from '@/lib/paypal'
import { db } from '@/lib/db'
import { capturePaymentOrderSchema } from '@/lib/validations'
import { markSquaresAsSold } from '@/services/gridService'
import { redis, CACHE_KEYS } from '@/lib/redis'

/**
 * POST /api/payments/capture-order
 * Capture a PayPal order after buyer approval
 */
export async function POST(request: NextRequest) {
  let orderId: string | undefined
  try {
    const body = await request.json()

    // Validate input
    const validation = capturePaymentOrderSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    orderId = validation.data.orderId

    // Find transaction
    const transaction = await db.transaction.findUnique({
      where: { paypalOrderId: orderId },
      include: { campaign: true },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    if (transaction.status !== 'pending') {
      return NextResponse.json(
        { error: `Transaction already ${transaction.status}` },
        { status: 400 }
      )
    }

    // Capture payment via PayPal
    const captureResult = await capturePayPalOrder(orderId)

    // Extract capture details
    const capture = captureResult.purchase_units[0]?.payments?.captures?.[0]
    if (!capture) {
      throw new Error('No capture found in PayPal response')
    }

    // Extract square IDs and donor info from transaction metadata
    const metadata = transaction.metadata as any
    const squareIds = metadata.squareIds || []
    const donorName = transaction.donorName

    if (!squareIds.length) {
      throw new Error('No square IDs found in transaction')
    }

    // Update transaction to completed status
    await db.transaction.update({
      where: { id: transaction.id },
      data: {
        status: 'completed',
        paypalCaptureId: capture.id,
        paypalTransactionId: capture.id,
        paypalPayerId: captureResult.payer.payer_id,
        paymentMethod: captureResult.payer.email_address ? 'paypal' : 'card',
        metadata: {
          ...(transaction.metadata as any),
          captureResult,
        },
      },
    })

    // Mark squares as sold immediately
    console.log('Marking squares as sold:', { squareIds, donorName, transactionId: transaction.id })
    await markSquaresAsSold(squareIds, transaction.id, donorName)

    // Invalidate grid cache to show updated state immediately
    const campaignSlug = transaction.campaign.slug
    try {
      await redis.del(CACHE_KEYS.grid(campaignSlug))
      console.log('Cache invalidated for campaign:', campaignSlug)
    } catch (error) {
      console.log('Redis cache invalidation failed (non-critical):', error)
    }

    console.log('Payment capture complete:', {
      transactionId: transaction.id,
      captureId: capture.id,
      squareCount: squareIds.length
    })

    return NextResponse.json({
      success: true,
      transactionId: transaction.id,
      captureId: capture.id,
      status: capture.status,
      amount: capture.amount.value,
      message: 'Payment completed successfully!',
    })
  } catch (error: any) {
    console.error('Capture order error:', error)

    // Update transaction to failed if we have the orderId
    if (orderId) {
      try {
        await db.transaction.updateMany({
          where: {
            paypalOrderId: orderId,
            status: 'pending',
          },
          data: {
            status: 'failed',
            failureReason: error.message,
          },
        })
      } catch (updateError) {
        console.error('Failed to update transaction:', updateError)
      }
    }

    return NextResponse.json(
      { error: error.message || 'Failed to capture payment' },
      { status: 500 }
    )
  }
}
