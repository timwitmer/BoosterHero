/**
 * PayPal Webhook Simulator
 *
 * Simulates PayPal webhook events for testing without needing ngrok or actual payments.
 * Use ONLY in development/testing environments.
 *
 * Usage: npx tsx scripts/simulate-webhook.ts <orderId>
 */

import { randomUUID } from 'crypto'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const orderId = process.argv[2]

if (!orderId) {
  console.error('❌ Error: Order ID required')
  console.log('Usage: npx tsx scripts/simulate-webhook.ts <orderId>')
  process.exit(1)
}

// Simulate PAYMENT.CAPTURE.COMPLETED event
const webhookEvent = {
  id: `WH-${randomUUID()}`,
  event_version: '1.0',
  create_time: new Date().toISOString(),
  resource_type: 'capture',
  event_type: 'PAYMENT.CAPTURE.COMPLETED',
  summary: 'Payment completed for order',
  resource: {
    id: `CAPTURE-${randomUUID()}`,
    status: 'COMPLETED',
    amount: {
      currency_code: 'USD',
      value: '25.00',
    },
    final_capture: true,
    seller_protection: {
      status: 'ELIGIBLE',
    },
    seller_receivable_breakdown: {
      gross_amount: {
        currency_code: 'USD',
        value: '25.00',
      },
      paypal_fee: {
        currency_code: 'USD',
        value: '1.02',
      },
      net_amount: {
        currency_code: 'USD',
        value: '23.98',
      },
    },
    supplementary_data: {
      related_ids: {
        order_id: orderId,
      },
    },
    create_time: new Date().toISOString(),
    update_time: new Date().toISOString(),
  },
  links: [
    {
      href: `https://api.sandbox.paypal.com/v1/notifications/webhooks-events/${randomUUID()}`,
      rel: 'self',
      method: 'GET',
    },
  ],
}

async function simulateWebhook() {
  console.log('🧪 Simulating PayPal Webhook\n')
  console.log(`Target: ${BASE_URL}/api/webhooks/paypal`)
  console.log(`Order ID: ${orderId}`)
  console.log(`Event ID: ${webhookEvent.id}\n`)

  console.log('⚠️  WARNING: This bypasses signature verification!')
  console.log('   Use ONLY for development/testing\n')

  try {
    // Note: In development, you may need to temporarily disable signature verification
    // in the webhook handler to test with simulated events
    const response = await fetch(`${BASE_URL}/api/webhooks/paypal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // These headers would normally be set by PayPal
        'paypal-transmission-id': randomUUID(),
        'paypal-transmission-time': new Date().toISOString(),
        'paypal-transmission-sig': 'simulated-signature',
        'paypal-cert-url': 'https://api.sandbox.paypal.com/cert',
        'paypal-auth-algo': 'SHA256withRSA',
      },
      body: JSON.stringify(webhookEvent),
    })

    const data = await response.json()

    if (response.ok) {
      console.log('✅ Webhook processed successfully\n')
      console.log('Response:', JSON.stringify(data, null, 2))
    } else {
      console.log('❌ Webhook processing failed\n')
      console.log('Status:', response.status)
      console.log('Error:', JSON.stringify(data, null, 2))

      if (response.status === 401) {
        console.log('\n💡 Tip: Temporarily disable signature verification in webhook handler:')
        console.log('   // const isValid = await verifyWebhookSignature(headers, body)')
        console.log('   const isValid = true // TEMP for testing')
      }
    }
  } catch (error: any) {
    console.log('❌ Error sending webhook:', error.message)
  }
}

simulateWebhook()
