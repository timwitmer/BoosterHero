import { currentUser } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import { db } from '@/lib/db'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import ActivateCampaignButton from './ActivateCampaignButton'
import PauseCampaignButton from './PauseCampaignButton'
import QRCodeSection from './QRCodeSection'

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const clerkUser = await currentUser()

  if (!clerkUser) {
    redirect('/sign-in')
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: clerkUser.id },
  })

  if (!user) {
    redirect('/sign-in')
  }

  // Get campaign with stats
  const campaign = await db.campaign.findUnique({
    where: { id, userId: user.id },
    include: {
      gridSquares: {
        include: {
          purchasedSquares: true,
        },
      },
      transactions: {
        where: { status: 'completed' },
        orderBy: { createdAt: 'desc' },
        take: 10,
      },
    },
  })

  if (!campaign) {
    notFound()
  }

  // Calculate statistics
  const totalSquares = campaign.gridSquares.length
  const soldSquares = campaign.gridSquares.filter(s => s.status === 'sold').length
  const availableSquares = campaign.gridSquares.filter(s => s.status === 'available').length
  const pendingSquares = campaign.gridSquares.filter(s => s.status === 'pending').length

  const totalRaised = campaign.transactions.reduce(
    (sum, t) => sum + parseFloat(t.amount.toString()),
    0
  )

  const completionPercentage = totalSquares > 0
    ? Math.round((soldSquares / totalSquares) * 100)
    : 0

  const uniqueDonors = new Set(campaign.transactions.map(t => t.donorEmail)).size

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <Link href="/dashboard/campaigns" className="hover:text-blue-600">
            Campaigns
          </Link>
          <span>/</span>
          <span>{campaign.title}</span>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{campaign.title}</h1>
            <p className="text-gray-600 mt-2">
              {campaign.sport} • Created {new Date(campaign.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex gap-3">
            <Link href={`/give/${campaign.slug}`} target="_blank">
              <Button variant="outline">View Public Page</Button>
            </Link>
            <Button>Edit Campaign</Button>
          </div>
        </div>
      </div>

      {/* Status Banner */}
      <div
        className={`mb-6 p-4 rounded-lg ${
          campaign.status === 'draft'
            ? 'bg-yellow-50 border border-yellow-200'
            : campaign.status === 'active'
            ? 'bg-green-50 border border-green-200'
            : campaign.status === 'paused'
            ? 'bg-orange-50 border border-orange-200'
            : 'bg-blue-50 border border-blue-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p
              className={`font-semibold ${
                campaign.status === 'draft'
                  ? 'text-yellow-900'
                  : campaign.status === 'active'
                  ? 'text-green-900'
                  : campaign.status === 'paused'
                  ? 'text-orange-900'
                  : 'text-blue-900'
              }`}
            >
              Campaign Status: {campaign.status.toUpperCase()}
            </p>
            {campaign.status === 'draft' && (
              <p className="text-sm text-yellow-700 mt-1">
                Your campaign is in draft mode. Activate it to start accepting donations.
              </p>
            )}
            {campaign.status === 'active' && (
              <p className="text-sm text-green-700 mt-1">
                Your campaign is live and accepting donations.
              </p>
            )}
            {campaign.status === 'paused' && (
              <p className="text-sm text-orange-700 mt-1">
                Your campaign is paused. Reactivate it to resume accepting donations.
              </p>
            )}
            {campaign.status === 'completed' && (
              <p className="text-sm text-blue-700 mt-1">
                This campaign has been completed.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {campaign.status === 'draft' && (
              <ActivateCampaignButton campaignSlug={campaign.slug} currentStatus={campaign.status} />
            )}
            {campaign.status === 'active' && (
              <PauseCampaignButton campaignSlug={campaign.slug} />
            )}
            {campaign.status === 'paused' && (
              <ActivateCampaignButton campaignSlug={campaign.slug} currentStatus={campaign.status} />
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Raised
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              ${totalRaised.toFixed(2)}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              of ${campaign.fundraisingGoal.toString()} goal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Grid Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {completionPercentage}%
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {soldSquares} of {totalSquares} squares sold
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Donors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {uniqueDonors}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Unique supporters
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Available Squares
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {availableSquares}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {pendingSquares} pending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* QR Code & Sharing */}
      {campaign.status !== 'draft' && (
        <QRCodeSection
          campaignSlug={campaign.slug}
          campaignTitle={campaign.title}
        />
      )}

      {/* Recent Donations */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Donations</CardTitle>
        </CardHeader>
        <CardContent>
          {campaign.transactions.length > 0 ? (
            <div className="space-y-4">
              {campaign.transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {transaction.donorName}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(transaction.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      ${transaction.amount.toString()}
                    </p>
                    <p className="text-xs text-gray-600">{transaction.status}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-600">
              No donations yet. Share your campaign to get started!
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
