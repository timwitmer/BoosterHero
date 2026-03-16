import { db } from '@/lib/db'
import { redis, CACHE_KEYS } from '@/lib/redis'

export interface PaymentStatus {
  transactionId: string
  status: string
  amount: string
  donorName: string
  completedAt?: Date
  failureReason?: string
}

/**
 * Get payment status by transaction ID
 */
export async function getPaymentStatus(transactionId: string): Promise<PaymentStatus | null> {
  const transaction = await db.transaction.findUnique({
    where: { id: transactionId },
  })

  if (!transaction) {
    return null
  }

  return {
    transactionId: transaction.id,
    status: transaction.status,
    amount: transaction.amount.toString(),
    donorName: transaction.donorName,
    completedAt: transaction.completedAt || undefined,
    failureReason: transaction.failureReason || undefined,
  }
}

/**
 * Get payment status by PayPal order ID
 */
export async function getPaymentStatusByOrderId(orderId: string): Promise<PaymentStatus | null> {
  const transaction = await db.transaction.findUnique({
    where: { paypalOrderId: orderId },
  })

  if (!transaction) {
    return null
  }

  return {
    transactionId: transaction.id,
    status: transaction.status,
    amount: transaction.amount.toString(),
    donorName: transaction.donorName,
    completedAt: transaction.completedAt || undefined,
    failureReason: transaction.failureReason || undefined,
  }
}

/**
 * Poll payment status (for clients without WebSocket)
 */
export async function pollPaymentStatus(
  transactionId: string,
  maxAttempts: number = 30,
  interval: number = 2000
): Promise<PaymentStatus> {
  return new Promise(async (resolve, reject) => {
    let attempts = 0

    const poll = async () => {
      attempts++

      const status = await getPaymentStatus(transactionId)

      if (!status) {
        reject(new Error('Transaction not found'))
        return
      }

      // Check if payment is finalized
      if (status.status === 'completed') {
        resolve(status)
        return
      }

      if (status.status === 'failed' || status.status === 'refunded') {
        reject(new Error(status.failureReason || 'Payment failed'))
        return
      }

      // Continue polling if still pending/processing
      if (attempts < maxAttempts) {
        setTimeout(poll, interval)
      } else {
        reject(new Error('Payment status check timeout'))
      }
    }

    poll()
  })
}

/**
 * Cancel pending payment (unlock squares)
 */
export async function cancelPendingPayment(transactionId: string): Promise<void> {
  await db.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({
      where: { id: transactionId },
      include: { campaign: true },
    })

    if (!transaction || transaction.status !== 'pending') {
      return
    }

    // Update transaction
    await tx.transaction.update({
      where: { id: transactionId },
      data: {
        status: 'failed',
        failureReason: 'Cancelled by user',
      },
    })

    // Unlock squares
    const metadata = transaction.metadata as any
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

    // Clear cache
    await redis.del(CACHE_KEYS.grid(transaction.campaign.slug))
  })
}

/**
 * Get campaign transaction summary
 */
export async function getCampaignTransactionSummary(campaignId: string) {
  const transactions = await db.transaction.findMany({
    where: { campaignId },
    orderBy: { createdAt: 'desc' },
  })

  const summary = {
    totalTransactions: transactions.length,
    completedTransactions: transactions.filter(t => t.status === 'completed').length,
    pendingTransactions: transactions.filter(t => t.status === 'pending').length,
    failedTransactions: transactions.filter(t => t.status === 'failed').length,
    totalRaised: transactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0),
    totalFees: transactions
      .filter(t => t.status === 'completed' && t.feeAmount)
      .reduce((sum, t) => sum + parseFloat(t.feeAmount!.toString()), 0),
    recentTransactions: transactions.slice(0, 10).map(t => ({
      id: t.id,
      donorName: t.donorName,
      amount: t.amount.toString(),
      status: t.status,
      createdAt: t.createdAt,
    })),
  }

  return summary
}

/**
 * Get donor's transaction history for a campaign
 */
export async function getDonorTransactions(campaignId: string, donorEmail: string) {
  const transactions = await db.transaction.findMany({
    where: {
      campaignId,
      donorEmail: donorEmail.toLowerCase(),
      status: 'completed',
    },
    include: {
      purchasedSquares: {
        include: {
          square: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return transactions.map(t => ({
    id: t.id,
    amount: t.amount.toString(),
    squareCount: t.purchasedSquares.length,
    completedAt: t.completedAt,
    squares: t.purchasedSquares.map(ps => ({
      positionX: ps.square.positionX,
      positionY: ps.square.positionY,
    })),
  }))
}
