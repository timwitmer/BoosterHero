import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { createCampaignSchema } from '@/lib/validations'
import { generateSlug } from '@/lib/utils'
import { initializeGrid } from '@/services/gridService'

/**
 * POST /api/campaigns
 * Create a new campaign
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()

    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { clerkUserId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const body = await request.json()

    // Validate input
    const validation = createCampaignSchema.safeParse({
      ...body,
      squareValue: body.squareValue || 10, // Default square value
    })

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data

    // Generate unique slug
    const baseSlug = generateSlug(data.title)
    let slug = baseSlug
    let counter = 1

    // Ensure slug is unique
    while (await db.campaign.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    // Create campaign
    const campaign = await db.campaign.create({
      data: {
        userId: user.id,
        slug,
        title: data.title,
        description: data.description,
        sport: data.sport,
        teamName: data.teamName,
        schoolName: data.schoolName || user.schoolName,
        fundraisingGoal: data.fundraisingGoal,
        gridRows: data.gridRows,
        gridCols: data.gridCols,
        status: 'draft', // Start as draft
      },
    })

    // Initialize grid squares
    const squareValue = validation.data.squareValue || 10
    await initializeGrid(
      campaign.id,
      campaign.gridRows,
      campaign.gridCols,
      squareValue
    )

    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        slug: campaign.slug,
        title: campaign.title,
        status: campaign.status,
      },
    })
  } catch (error: any) {
    console.error('Create campaign error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/campaigns
 * List user's campaigns
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth()

    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { clerkUserId },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get campaigns
    const campaigns = await db.campaign.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            gridSquares: true,
            transactions: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      campaigns,
    })
  } catch (error: any) {
    console.error('List campaigns error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
