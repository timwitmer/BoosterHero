import { NextRequest, NextResponse } from 'next/server'
import { getPaymentStatus } from '@/services/paymentService'

/**
 * GET /api/payments/status/[transactionId]
 * Get payment status (for polling)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    const { transactionId } = await params

    const status = await getPaymentStatus(transactionId)

    if (!status) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      ...status,
    })
  } catch (error: any) {
    console.error('Get payment status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
