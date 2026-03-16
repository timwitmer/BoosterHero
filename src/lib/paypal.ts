/**
 * PayPal REST API Integration
 * Uses PayPal's REST API directly (no deprecated SDK)
 */

const PAYPAL_API_BASE = process.env.PAYPAL_MODE === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

/**
 * Get PayPal OAuth access token
 */
async function getAccessToken(): Promise<string> {
  const auth = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`
  ).toString('base64')

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })

  if (!response.ok) {
    throw new Error('Failed to get PayPal access token')
  }

  const data = await response.json()
  return data.access_token
}

export interface CreateOrderParams {
  amount: string
  currency?: string
  customId?: string
  description?: string
}

export interface OrderResponse {
  id: string
  status: string
  links: Array<{
    href: string
    rel: string
    method: string
  }>
}

export interface CaptureOrderResponse {
  id: string
  status: string
  purchase_units: Array<{
    payments: {
      captures: Array<{
        id: string
        status: string
        amount: {
          currency_code: string
          value: string
        }
      }>
    }
  }>
  payer: {
    email_address: string
    payer_id: string
    name: {
      given_name: string
      surname: string
    }
  }
}

/**
 * Create a PayPal order
 */
export async function createOrder(params: CreateOrderParams): Promise<OrderResponse> {
  try {
    const accessToken = await getAccessToken()

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: params.currency || 'USD',
              value: params.amount,
            },
            description: params.description || 'GridGive Campaign Donation',
            custom_id: params.customId,
          },
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('PayPal create order error:', error)
      throw new Error('Failed to create PayPal order')
    }

    const orderData = await response.json()
    const approvalUrl = orderData.links?.find((link: any) => link.rel === 'approve')?.href
    console.log('PayPal order created successfully:', {
      id: orderData.id,
      status: orderData.status,
      approvalUrl: approvalUrl
    })
    console.log('>>> Test approval URL directly: ' + approvalUrl)
    return orderData
  } catch (error) {
    console.error('PayPal create order error:', error)
    throw new Error('Failed to create PayPal order')
  }
}

/**
 * Capture a PayPal order
 */
export async function captureOrder(orderId: string): Promise<CaptureOrderResponse> {
  try {
    const accessToken = await getAccessToken()

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('PayPal capture order error:', error)
      throw new Error('Failed to capture PayPal order')
    }

    return await response.json()
  } catch (error) {
    console.error('PayPal capture order error:', error)
    throw new Error('Failed to capture PayPal order')
  }
}

/**
 * Get order details
 */
export async function getOrderDetails(orderId: string): Promise<any> {
  try {
    const accessToken = await getAccessToken()

    const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('PayPal get order error:', error)
      throw new Error('Failed to get PayPal order details')
    }

    return await response.json()
  } catch (error) {
    console.error('PayPal get order error:', error)
    throw new Error('Failed to get PayPal order details')
  }
}

/**
 * Verify PayPal webhook signature
 */
export async function verifyWebhookSignature(
  headers: Record<string, string>,
  body: any
): Promise<boolean> {
  try {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID
    if (!webhookId) {
      throw new Error('PayPal webhook ID not configured')
    }

    const accessToken = await getAccessToken()

    const response = await fetch(`${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transmission_id: headers['paypal-transmission-id'],
        transmission_time: headers['paypal-transmission-time'],
        cert_url: headers['paypal-cert-url'],
        auth_algo: headers['paypal-auth-algo'],
        transmission_sig: headers['paypal-transmission-sig'],
        webhook_id: webhookId,
        webhook_event: body,
      }),
    })

    if (!response.ok) {
      console.error('PayPal webhook verification failed:', await response.text())
      return false
    }

    const result = await response.json()
    return result.verification_status === 'SUCCESS'
  } catch (error) {
    console.error('PayPal webhook verification error:', error)
    return false
  }
}

/**
 * Refund a captured payment
 */
export async function refundCapture(
  captureId: string,
  amount?: string,
  currency?: string
): Promise<any> {
  try {
    const accessToken = await getAccessToken()

    const requestBody: any = {}
    if (amount && currency) {
      requestBody.amount = {
        value: amount,
        currency_code: currency,
      }
    }

    const response = await fetch(`${PAYPAL_API_BASE}/v2/payments/captures/${captureId}/refund`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('PayPal refund error:', error)
      throw new Error('Failed to refund payment')
    }

    return await response.json()
  } catch (error) {
    console.error('PayPal refund error:', error)
    throw new Error('Failed to refund payment')
  }
}
