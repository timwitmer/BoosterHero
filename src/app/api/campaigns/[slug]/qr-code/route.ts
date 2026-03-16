import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { generateQRCodeBuffer, getCampaignQRCodeUrl } from '@/lib/qr'

/**
 * GET /api/campaigns/[slug]/qr-code
 * Generate and download QR code for campaign
 */
export async function GET(
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

    // Generate QR code URL
    const campaignUrl = getCampaignQRCodeUrl(campaign.slug)

    // Generate QR code image
    const qrCodeBuffer = await generateQRCodeBuffer(campaignUrl)

    // Return image with appropriate headers (convert Buffer to Uint8Array for Next.js 15)
    return new NextResponse(new Uint8Array(qrCodeBuffer), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="gridgive-${campaign.slug}-qr.png"`,
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error: any) {
    console.error('QR code generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
