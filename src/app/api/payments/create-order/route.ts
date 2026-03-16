import { NextRequest, NextResponse } from 'next/server'
import { createOrder as createPayPalOrder } from '@/lib/paypal'
import { getLockInfo } from '@/services/gridService'
import { db } from '@/lib/db'
import { createPaymentOrderSchema } from '@/lib/validations'

/**
 * POST /api/payments/create-order
 * Create a PayPal order for locked squares
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Create order request:', { ...body, lockToken: body.lockToken?.substring(0, 10) + '...' })

    // Validate input
    const validation = createPaymentOrderSchema.safeParse(body)
    if (!validation.success) {
      console.error('Validation failed:', validation.error.errors)
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { lockToken, donorEmail, donorName } = validation.data

    // Verify lock token and get lock info
    console.log('Getting lock info for token:', lockToken.substring(0, 10) + '...')
    const lockInfo = await getLockInfo(lockToken)

    if (!lockInfo) {
      console.error('Lock info not found for token:', lockToken.substring(0, 10) + '...')
      return NextResponse.json(
        { error: 'Invalid or expired lock token' },
        { status: 400 }
      )
    }

    console.log('Lock info retrieved:', {
      campaignId: lockInfo.campaignId,
      squareCount: lockInfo.squareIds?.length,
      totalAmount: lockInfo.totalAmount
    })

    const { campaignId, squareIds, totalAmount } = lockInfo

    // Verify campaign exists and is active
    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
    })

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    if (campaign.status !== 'active') {
      return NextResponse.json(
        { error: 'Campaign is not active' },
        { status: 400 }
      )
    }

    // Create PayPal order
    console.log('Creating PayPal order...')
    const paypalOrder = await createPayPalOrder({
      amount: totalAmount,
      currency: 'USD',
      customId: lockToken,
      description: `${campaign.title} - ${squareIds.length} square(s)`,
    })
    console.log('PayPal order created:', paypalOrder.id)

    // Create transaction record
    const transaction = await db.transaction.create({
      data: {
        campaignId,
        paypalOrderId: paypalOrder.id,
        donorEmail,
        donorName,
        amount: totalAmount,
        currency: 'USD',
        status: 'pending',
        metadata: JSON.parse(JSON.stringify({
          lockToken,
          squareIds,
          paypalOrderData: paypalOrder,
        })),
      },
    })
    console.log('Transaction record created:', transaction.id)

    // Find approval URL
    const approvalUrl = paypalOrder.links.find(link => link.rel === 'approve')?.href

    const response = {
      success: true,
      orderId: paypalOrder.id,
      transactionId: transaction.id,
      approvalUrl,
      amount: totalAmount,
    }
    console.log('Returning order response:', response)

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Create order error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create payment order' },
      { status: 500 }
    )
  }
}
