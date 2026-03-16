/**
 * Payment Flow Test Script
 *
 * This script simulates the payment flow to verify all components work correctly.
 * Run with: npx tsx scripts/test-payment-flow.ts
 */

interface TestResult {
  step: string
  success: boolean
  data?: any
  error?: string
}

const results: TestResult[] = []

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const CAMPAIGN_SLUG = process.env.TEST_CAMPAIGN_SLUG || 'test-campaign'

async function testPaymentFlow() {
  console.log('🧪 Testing Payment Flow\n')
  console.log(`Base URL: ${BASE_URL}`)
  console.log(`Campaign: ${CAMPAIGN_SLUG}\n`)

  // Step 1: Lock Squares
  console.log('1️⃣  Testing Lock Squares...')
  try {
    const lockResponse = await fetch(`${BASE_URL}/api/campaigns/${CAMPAIGN_SLUG}/grid/lock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        squareIds: ['square-id-1', 'square-id-2'], // Replace with actual IDs
      }),
    })

    const lockData = await lockResponse.json()

    if (lockResponse.ok && lockData.success) {
      results.push({
        step: 'Lock Squares',
        success: true,
        data: {
          lockToken: lockData.lockToken,
          lockedCount: lockData.lockedSquares.length,
          totalAmount: lockData.totalAmount,
        },
      })
      console.log('   ✅ Squares locked successfully')
      console.log(`   Token: ${lockData.lockToken.substring(0, 20)}...`)
      console.log(`   Amount: $${lockData.totalAmount}\n`)

      // Step 2: Create Order
      console.log('2️⃣  Testing Create Order...')
      const orderResponse = await fetch(`${BASE_URL}/api/payments/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lockToken: lockData.lockToken,
          donorEmail: 'test@example.com',
          donorName: 'Test Donor',
        }),
      })

      const orderData = await orderResponse.json()

      if (orderResponse.ok && orderData.success) {
        results.push({
          step: 'Create Order',
          success: true,
          data: {
            orderId: orderData.orderId,
            transactionId: orderData.transactionId,
          },
        })
        console.log('   ✅ Order created successfully')
        console.log(`   Order ID: ${orderData.orderId}`)
        console.log(`   Transaction ID: ${orderData.transactionId}`)
        console.log(`   Approval URL: ${orderData.approvalUrl}\n`)

        // Step 3: Check Payment Status
        console.log('3️⃣  Testing Payment Status...')
        const statusResponse = await fetch(
          `${BASE_URL}/api/payments/status/${orderData.transactionId}`
        )

        const statusData = await statusResponse.json()

        if (statusResponse.ok) {
          results.push({
            step: 'Payment Status',
            success: true,
            data: {
              status: statusData.status,
            },
          })
          console.log('   ✅ Status retrieved successfully')
          console.log(`   Status: ${statusData.status}\n`)
        } else {
          throw new Error(statusData.error)
        }

        // Step 4: Unlock Squares (cleanup)
        console.log('4️⃣  Testing Unlock Squares...')
        const unlockResponse = await fetch(`${BASE_URL}/api/campaigns/${CAMPAIGN_SLUG}/grid/unlock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lockToken: lockData.lockToken,
          }),
        })

        const unlockData = await unlockResponse.json()

        if (unlockResponse.ok && unlockData.success) {
          results.push({
            step: 'Unlock Squares',
            success: true,
          })
          console.log('   ✅ Squares unlocked successfully\n')
        } else {
          throw new Error(unlockData.error)
        }
      } else {
        throw new Error(orderData.error || 'Failed to create order')
      }
    } else {
      throw new Error(lockData.error || 'Failed to lock squares')
    }
  } catch (error: any) {
    results.push({
      step: 'Payment Flow',
      success: false,
      error: error.message,
    })
    console.log(`   ❌ Error: ${error.message}\n`)
  }

  // Summary
  console.log('📊 Test Summary')
  console.log('=' .repeat(50))

  const passed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  results.forEach(result => {
    const icon = result.success ? '✅' : '❌'
    console.log(`${icon} ${result.step}`)
    if (result.error) {
      console.log(`   Error: ${result.error}`)
    }
  })

  console.log('=' .repeat(50))
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`)

  if (failed === 0) {
    console.log('\n🎉 All tests passed!')
  } else {
    console.log('\n⚠️  Some tests failed. Check errors above.')
  }
}

// Run tests
testPaymentFlow().catch(console.error)
