import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function DashboardPage() {
  const clerkUser = await currentUser()

  if (!clerkUser) {
    redirect('/sign-in')
  }

  // Get or create user in database
  let user = await db.user.findUnique({
    where: { clerkUserId: clerkUser.id },
  })

  if (!user) {
    // Create user on first sign-in
    user = await db.user.create({
      data: {
        clerkUserId: clerkUser.id,
        email: clerkUser.emailAddresses[0].emailAddress,
        firstName: clerkUser.firstName || 'Athlete',
        lastName: clerkUser.lastName || 'User',
        role: 'athlete',
      },
    })
  }

  // Get user's campaigns
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

  // Calculate totals
  const totalCampaigns = campaigns.length
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user.firstName}! 👋
        </h1>
        <p className="text-gray-600 mt-2">
          Manage your fundraising campaigns and track your progress
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">
              {totalCampaigns}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Campaigns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {activeCampaigns}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Raised
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              $0.00
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="flex gap-4">
          <Link href="/dashboard/campaigns/new">
            <Button size="lg">
              Create New Campaign
            </Button>
          </Link>
          <Link href="/dashboard/campaigns">
            <Button variant="outline" size="lg">
              View All Campaigns
            </Button>
          </Link>
        </div>
      </div>

      {/* Recent Campaigns */}
      {campaigns.length > 0 ? (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Recent Campaigns
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {campaigns.slice(0, 4).map((campaign) => (
              <Card key={campaign.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{campaign.title}</CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {campaign.sport} • {campaign.status}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        campaign.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : campaign.status === 'draft'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {campaign.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Goal:</span>
                      <span className="font-semibold">
                        ${campaign.fundraisingGoal.toString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Grid:</span>
                      <span className="font-semibold">
                        {campaign.gridRows} × {campaign.gridCols}
                      </span>
                    </div>
                    <Link href={`/dashboard/campaigns/${campaign.id}`}>
                      <Button variant="outline" className="w-full mt-4">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No campaigns yet
          </h3>
          <p className="text-gray-600 mb-6">
            Get started by creating your first fundraising campaign
          </p>
          <Link href="/dashboard/campaigns/new">
            <Button size="lg">Create Your First Campaign</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
