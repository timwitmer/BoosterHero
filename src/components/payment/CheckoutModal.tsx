'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PayPalButton } from './PayPalButton'
import { formatCurrency } from '@/lib/utils'

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  selectedSquares: Array<{
    id: string
    positionX: number
    positionY: number
    squareValue: string
  }>
  campaignSlug: string
  campaignTitle: string
  onPaymentSuccess: () => void
}

export function CheckoutModal({
  isOpen,
  onClose,
  selectedSquares,
  campaignSlug,
  campaignTitle,
  onPaymentSuccess,
}: CheckoutModalProps) {
  const [step, setStep] = useState<'info' | 'payment' | 'success'>('info')
  const [donorName, setDonorName] = useState('')
  const [donorEmail, setDonorEmail] = useState('')
  const [lockToken, setLockToken] = useState('')
  const [isLocking, setIsLocking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const totalAmount = selectedSquares.reduce(
    (sum, square) => sum + parseFloat(square.squareValue),
    0
  )

  const handleDonorInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLocking(true)

    try {
      // Lock squares
      const response = await fetch(`/api/campaigns/${campaignSlug}/grid/lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          squareIds: selectedSquares.map(s => s.id),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to lock squares')
      }

      if (data.failedSquares && data.failedSquares.length > 0) {
        throw new Error(
          `${data.failedSquares.length} square(s) are no longer available. Please select different squares.`
        )
      }

      setLockToken(data.lockToken)
      setStep('payment')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLocking(false)
    }
  }

  const handlePaymentSuccess = (transactionId: string) => {
    console.log('Payment successful:', transactionId)
    setStep('success')

    // Refresh grid immediately to show updated state
    onPaymentSuccess()

    // Close modal after showing success message
    setTimeout(() => {
      onClose()
      resetModal()
    }, 3000)
  }

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage)
    // Unlock squares
    if (lockToken) {
      fetch(`/api/campaigns/${campaignSlug}/grid/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lockToken }),
      }).catch(console.error)
    }
  }

  const handlePaymentCancel = () => {
    // Unlock squares
    if (lockToken) {
      fetch(`/api/campaigns/${campaignSlug}/grid/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lockToken }),
      }).catch(console.error)
    }
    setError('Payment cancelled')
  }

  const resetModal = () => {
    setStep('info')
    setDonorName('')
    setDonorEmail('')
    setLockToken('')
    setError(null)
  }

  const handleClose = () => {
    if (step === 'payment' && lockToken) {
      // Unlock squares if closing during payment
      fetch(`/api/campaigns/${campaignSlug}/grid/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ lockToken }),
      }).catch(console.error)
    }
    onClose()
    resetModal()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold">
            {step === 'info' && 'Complete Your Donation'}
            {step === 'payment' && 'Choose Payment Method'}
            {step === 'success' && 'Thank You!'}
          </h2>
          <button
            onClick={handleClose}
            disabled={isLocking}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Order Summary */}
          <div className="mb-6 p-4 bg-gray-50 rounded-md">
            <h3 className="font-semibold mb-2">Order Summary</h3>
            <p className="text-sm text-gray-600 mb-2">{campaignTitle}</p>
            <div className="flex justify-between items-center">
              <span className="text-sm">
                {selectedSquares.length} square{selectedSquares.length !== 1 ? 's' : ''}
              </span>
              <span className="text-xl font-bold text-blue-600">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>

          {/* Step: Donor Info */}
          {step === 'info' && (
            <form onSubmit={handleDonorInfoSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Your Name *</Label>
                <Input
                  id="name"
                  type="text"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="John Doe"
                  required
                  maxLength={255}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This will be displayed on the grid
                </p>
              </div>

              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={donorEmail}
                  onChange={(e) => setDonorEmail(e.target.value)}
                  placeholder="john@example.com"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  For your receipt and updates
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isLocking}
              >
                {isLocking ? 'Processing...' : 'Continue to Payment'}
              </Button>
            </form>
          )}

          {/* Step: Payment */}
          {step === 'payment' && (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Choose your payment method below. Your squares are reserved for 5 minutes.
              </p>
              <PayPalButton
                amount={totalAmount.toFixed(2)}
                lockToken={lockToken}
                donorEmail={donorEmail}
                donorName={donorName}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                onCancel={handlePaymentCancel}
              />
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="text-center py-8">
              <div className="mb-4">
                <svg
                  className="w-16 h-16 text-green-500 mx-auto"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Payment Successful!</h3>
              <p className="text-gray-600 mb-4">
                Thank you for your donation of {formatCurrency(totalAmount)}
              </p>
              <p className="text-sm text-gray-500">
                A confirmation email has been sent to {donorEmail}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
