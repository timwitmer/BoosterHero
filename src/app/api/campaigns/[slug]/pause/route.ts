import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

/**
 * POST /api/campaigns/[slug]/pause
 * Pause an active campaign
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
    })

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Validate campaign is active
    if (campaign.status !== 'active') {
      return NextResponse.json(
        { error: `Campaign is ${campaign.status}. Only active campaigns can be paused.` },
        { status: 400 }
      )
    }

    // Pause campaign
    const updatedCampaign = await db.campaign.update({
      where: { id: campaign.id },
      data: {
        status: 'paused',
      },
    })

    return NextResponse.json({
      success: true,
      campaign: {
        id: updatedCampaign.id,
        status: updatedCampaign.status,
      },
      message: 'Campaign paused. Donors will no longer be able to purchase squares.',
    })
  } catch (error: any) {
    console.error('Pause campaign error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
