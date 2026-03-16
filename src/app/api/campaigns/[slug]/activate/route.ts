import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

/**
 * POST /api/campaigns/[id]/activate
 * Activate a draft campaign
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params
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

    // Get campaign by slug and ensure user owns it
    const campaign = await db.campaign.findFirst({
      where: {
        slug,
        userId: user.id,
      },
      include: {
        gridSquares: true,
      },
    })

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Validate campaign can be activated (draft or paused)
    if (campaign.status !== 'draft' && campaign.status !== 'paused') {
      return NextResponse.json(
        { error: `Campaign is ${campaign.status}. Only draft or paused campaigns can be activated.` },
        { status: 400 }
      )
    }

    // Validate campaign has grid squares
    if (campaign.gridSquares.length === 0) {
      return NextResponse.json(
        { error: 'Campaign has no grid squares. Please contact support.' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!campaign.title || !campaign.fundraisingGoal) {
      return NextResponse.json(
        { error: 'Campaign is missing required fields (title, fundraising goal)' },
        { status: 400 }
      )
    }

    // Activate campaign
    const updateData: any = {
      status: 'active',
    }

    // Only set activatedAt on first activation (from draft)
    if (campaign.status === 'draft' && !campaign.activatedAt) {
      updateData.activatedAt = new Date()
    }

    const updatedCampaign = await db.campaign.update({
      where: { id: campaign.id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      campaign: {
        id: updatedCampaign.id,
        status: updatedCampaign.status,
        activatedAt: updatedCampaign.activatedAt,
      },
      message: 'Campaign activated successfully! You can now share it with donors.',
    })
  } catch (error: any) {
    console.error('Activate campaign error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
