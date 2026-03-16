'use client'

import { useEffect, useRef, useState } from 'react'

interface PayPalButtonProps {
  amount: string
  lockToken: string
  donorEmail: string
  donorName: string
  onSuccess: (transactionId: string) => void
  onError: (error: string) => void
  onCancel: () => void
}

declare global {
  interface Window {
    paypal?: any
  }
}

export function PayPalButton({
  amount,
  lockToken,
  donorEmail,
  donorName,
  onSuccess,
  onError,
  onCancel,
}: PayPalButtonProps) {
  const paypalRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [scriptError, setScriptError] = useState<string | null>(null)

  // Use refs to store callbacks to prevent re-renders
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)
  const onCancelRef = useRef(onCancel)

  // Update refs when callbacks change
  useEffect(() => {
    onSuccessRef.current = onSuccess
    onErrorRef.current = onError
    onCancelRef.current = onCancel
  }, [onSuccess, onError, onCancel])

  // Load PayPal SDK script
  useEffect(() => {
    console.log('Loading PayPal SDK...')

    if (window.paypal) {
      console.log('PayPal SDK already loaded')
      setIsLoading(false)
      return
    }

    const script = document.createElement('script')
    script.src = `https://www.paypal.com/sdk/js?client-id=${process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID}&currency=USD&intent=capture&debug=true`
    script.async = true
    script.setAttribute('data-sdk-integration-source', 'button-factory')
    script.onload = () => {
      console.log('PayPal SDK loaded successfully')
      setIsLoading(false)
    }
    script.onerror = () => {
      console.error('Failed to load PayPal SDK')
      setScriptError('Failed to load PayPal SDK')
      setIsLoading(false)
    }
    document.body.appendChild(script)

    return () => {
      // Cleanup script if component unmounts
      document.body.removeChild(script)
    }
  }, []) // Only run once on mount

  // Render PayPal buttons after SDK is loaded and component is rendered
  useEffect(() => {
    if (isLoading) {
      console.log('Still loading, waiting...')
      return
    }

    console.log('PayPal SDK loaded, rendering buttons with props:', {
      amount,
      lockToken: lockToken?.substring(0, 10) + '...',
      donorEmail,
      donorName
    })

    console.log('renderPayPalButton called')
    console.log('window.paypal available:', !!window.paypal)
    console.log('paypalRef.current available:', !!paypalRef.current)

    if (!window.paypal) {
      console.error('PayPal SDK not loaded')
      return
    }

    if (!paypalRef.current) {
      console.error('PayPal container ref not available')
      return
    }

    // Clear existing buttons
    paypalRef.current.innerHTML = ''
    console.log('Rendering PayPal buttons...')

    try {
      window.paypal
        .Buttons({
          style: {
            layout: 'vertical',
            color: 'blue',
            shape: 'rect',
            label: 'paypal',
          },

          // Create order - must return a Promise that resolves to an order ID
          createOrder: function(data: any, actions: any) {
            console.log('PayPal createOrder called with data:', data)
            console.log('PayPal actions available:', actions)

            const startTime = Date.now()

            return fetch('/api/payments/create-order', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                lockToken,
                donorEmail,
                donorName,
              }),
            })
            .then(function(response) {
              console.log('Create order response received in', Date.now() - startTime, 'ms')
              console.log('Response status:', response.status)
              if (!response.ok) {
                throw new Error('Server returned error: ' + response.status)
              }
              return response.json()
            })
            .then(function(orderData) {
              console.log('Order data parsed:', orderData)
              console.log('Returning order ID to PayPal SDK:', orderData.orderId)

              if (!orderData.orderId) {
                throw new Error('No order ID received from server')
              }

              // This is what PayPal SDK expects
              return orderData.orderId
            })
            .catch(function(error) {
              console.error('❌ Create order error:', error)
              console.error('Error stack:', error.stack)
              onErrorRef.current(error.message || 'Failed to create order')
              throw error
            })
          },

          // Approve order
          onApprove: function(data: any, actions: any) {
            console.log('PayPal onApprove called with order:', data.orderID)

            return fetch('/api/payments/capture-order', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                orderId: data.orderID,
              }),
            })
            .then(function(response) {
              return response.json()
            })
            .then(function(result) {
              console.log('Payment captured:', result)
              if (!result.transactionId) {
                throw new Error('No transaction ID received')
              }
              onSuccessRef.current(result.transactionId)
            })
            .catch(function(error) {
              console.error('Capture error:', error)
              onErrorRef.current(error.message || 'Failed to capture payment')
            })
          },

          // Cancel order
          onCancel: () => {
            onCancelRef.current()
          },

          // Error handler
          onError: (err: any) => {
            console.error('PayPal SDK error:', err)
            console.error('Error details:', JSON.stringify(err, null, 2))
            onErrorRef.current('An error occurred with PayPal. Please try again.')
          },

          // Additional handlers for debugging
          onInit: (data: any, actions: any) => {
            console.log('✓ PayPal buttons initialized', data)
          },

          onClick: (data: any, actions: any) => {
            console.log('✓ PayPal button clicked')
            // Validate before opening popup
            if (!lockToken) {
              console.error('❌ No lock token available')
              return actions.reject()
            }
            if (!donorEmail || !donorName) {
              console.error('❌ Missing donor information')
              return actions.reject()
            }
            console.log('✓ Validation passed, proceeding with order creation')
            return actions.resolve()
          },
        })
        .render(paypalRef.current)
        .then(function() {
          console.log('✅ PayPal buttons rendered successfully')
        })
        .catch(function(err: any) {
          console.error('❌ PayPal button render error:', err)
          setScriptError('Failed to render PayPal button: ' + err.message)
        })
    } catch (err: any) {
      console.error('❌ PayPal button setup error:', err)
      setScriptError('Failed to setup PayPal button: ' + err.message)
    }

    // Cleanup
    return () => {
      console.log('Cleaning up PayPal buttons')
      if (paypalRef.current) {
        paypalRef.current.innerHTML = ''
      }
    }
  }, [isLoading, amount, lockToken, donorEmail, donorName])  // Re-render when these change

  return (
    <div>
      {scriptError && (
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{scriptError}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-blue-600 hover:underline"
          >
            Reload page
          </button>
        </div>
      )}

      {isLoading && !scriptError && (
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Loading PayPal...</p>
        </div>
      )}

      {/* Always render the ref div so it's available when needed */}
      <div
        ref={paypalRef}
        style={{ display: (isLoading || scriptError) ? 'none' : 'block' }}
      />
    </div>
  )
}
