/**
 * Generate Test Campaign with Grid
 *
 * Creates a sample campaign with initialized grid for testing.
 * Run with: npx tsx scripts/generate-test-campaign.ts
 */

import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

async function generateTestCampaign() {
  console.log('🎯 Generating test campaign...\n')

  try {
    // 1. Create test user
    console.log('1️⃣  Creating test user...')
    const user = await prisma.user.create({
      data: {
        email: `test-${randomBytes(4).toString('hex')}@example.com`,
        firstName: 'Test',
        lastName: 'Athlete',
        role: 'athlete',
        schoolName: 'Test High School',
      },
    })
    console.log(`   ✅ User created: ${user.email}\n`)

    // 2. Create campaign
    console.log('2️⃣  Creating campaign...')
    const slug = `test-campaign-${randomBytes(4).toString('hex')}`
    const campaign = await prisma.campaign.create({
      data: {
        userId: user.id,
        slug,
        title: 'Test Football Fundraiser',
        description: 'Help support our football team! Every donation helps us reach our goals.',
        sport: 'football',
        teamName: 'Eagles',
        schoolName: 'Test High School',
        fundraisingGoal: 1000,
        gridRows: 10,
        gridCols: 10,
        status: 'active',
      },
    })
    console.log(`   ✅ Campaign created: ${campaign.slug}`)
    console.log(`   URL: http://localhost:3000/give/${campaign.slug}\n`)

    // 3. Initialize grid squares
    console.log('3️⃣  Creating grid squares...')
    const squares = []
    const squareValue = 10 // $10 per square

    for (let y = 0; y < campaign.gridRows; y++) {
      for (let x = 0; x < campaign.gridCols; x++) {
        squares.push({
          campaignId: campaign.id,
          positionX: x,
          positionY: y,
          squareValue,
          status: 'available',
        })
      }
    }

    await prisma.gridSquare.createMany({
      data: squares,
    })
    console.log(`   ✅ Created ${squares.length} squares (${campaign.gridRows}x${campaign.gridCols})\n`)

    // 4. Optionally create some sold squares for testing
    console.log('4️⃣  Creating sample purchases...')

    const testDonors = [
      { name: 'John Doe', email: 'john@example.com' },
      { name: 'Jane Smith', email: 'jane@example.com' },
      { name: 'Bob Johnson', email: 'bob@example.com' },
    ]

    for (let i = 0; i < testDonors.length; i++) {
      const donor = testDonors[i]

      // Get a random available square
      const availableSquare = await prisma.gridSquare.findFirst({
        where: {
          campaignId: campaign.id,
          status: 'available',
        },
      })

      if (!availableSquare) break

      // Create transaction
      const transaction = await prisma.transaction.create({
        data: {
          campaignId: campaign.id,
          paypalOrderId: `TEST-ORDER-${randomBytes(8).toString('hex')}`,
          donorEmail: donor.email,
          donorName: donor.name,
          amount: availableSquare.squareValue,
          currency: 'USD',
          status: 'completed',
          completedAt: new Date(),
        },
      })

      // Mark square as sold
      await prisma.gridSquare.update({
        where: { id: availableSquare.id },
        data: { status: 'sold' },
      })

      // Create purchased square record
      await prisma.purchasedSquare.create({
        data: {
          transactionId: transaction.id,
          squareId: availableSquare.id,
          donorName: donor.name,
          donorInitials: donor.name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase(),
        },
      })

      console.log(`   ✅ ${donor.name} purchased square (${availableSquare.positionX}, ${availableSquare.positionY})`)
    }

    console.log('\n✨ Test campaign generated successfully!\n')
    console.log('📋 Campaign Details:')
    console.log(`   ID: ${campaign.id}`)
    console.log(`   Slug: ${campaign.slug}`)
    console.log(`   URL: http://localhost:3000/give/${campaign.slug}`)
    console.log(`   Athlete: ${user.firstName} ${user.lastName}`)
    console.log(`   Grid: ${campaign.gridRows}x${campaign.gridCols} (${squares.length} squares)`)
    console.log(`   Sample Purchases: ${testDonors.length}`)
    console.log(`   Total Raised: $${testDonors.length * squareValue}`)
    console.log('\n🚀 Visit the URL above to test the grid!')

  } catch (error) {
    console.error('❌ Error generating test campaign:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run the generator
generateTestCampaign()
