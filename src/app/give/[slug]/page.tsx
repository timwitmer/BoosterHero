import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import CampaignClient from './CampaignClient'

interface CampaignPageProps {
  params: Promise<{ slug: string }>
}

// Generate metadata for SEO
export async function generateMetadata({ params }: CampaignPageProps): Promise<Metadata> {
  const { slug } = await params
  const campaign = await db.campaign.findUnique({
    where: { slug },
    include: { user: true },
  })

  if (!campaign) {
    return {
      title: 'Campaign Not Found',
    }
  }

  const athleteName = `${campaign.user.firstName} ${campaign.user.lastName}`

  return {
    title: `${campaign.title} - GridGive`,
    description: campaign.description || `Support ${athleteName}'s fundraising campaign`,
    openGraph: {
      title: campaign.title,
      description: campaign.description || `Support ${athleteName}'s fundraising campaign`,
      images: campaign.athletePhotoUrl ? [campaign.athletePhotoUrl] : [],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: campaign.title,
      description: campaign.description || `Support ${athleteName}'s fundraising campaign`,
      images: campaign.athletePhotoUrl ? [campaign.athletePhotoUrl] : [],
    },
  }
}

// Fetch campaign data (SSR)
async function getCampaign(slug: string) {
  const campaign = await db.campaign.findUnique({
    where: { slug },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          profileImageUrl: true,
          schoolName: true,
        },
      },
    },
  })

  if (!campaign) {
    return null
  }

  return {
    id: campaign.id,
    slug: campaign.slug,
    title: campaign.title,
    description: campaign.description,
    sport: campaign.sport,
    teamName: campaign.teamName,
    schoolName: campaign.schoolName || campaign.user.schoolName,
    athletePhotoUrl: campaign.athletePhotoUrl || campaign.user.profileImageUrl,
    fundraisingGoal: campaign.fundraisingGoal.toString(),
    gridRows: campaign.gridRows,
    gridCols: campaign.gridCols,
    status: campaign.status,
    qrCodeUrl: campaign.qrCodeUrl,
    athlete: {
      name: `${campaign.user.firstName} ${campaign.user.lastName}`,
      firstName: campaign.user.firstName,
      lastName: campaign.user.lastName,
    },
  }
}

export default async function CampaignPage({ params }: CampaignPageProps) {
  const { slug } = await params
  const campaign = await getCampaign(slug)

  if (!campaign) {
    notFound()
  }

  if (campaign.status !== 'active') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Campaign Not Available
          </h1>
          <p className="text-gray-600 mb-6">
            This campaign is currently {campaign.status}.
          </p>
          {campaign.status === 'completed' && (
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-green-800 font-semibold">
                🎉 This campaign has been completed!
              </p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return <CampaignClient campaign={campaign} />
}
