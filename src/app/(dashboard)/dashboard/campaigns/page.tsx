import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import QuickShareButton from './QuickShareButton'

export default async function CampaignsPage() {
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

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Campaigns</h1>
          <p className="text-gray-600 mt-2">
            Manage and track all your fundraising campaigns
          </p>
        </div>
        <Link href="/dashboard/campaigns/new">
          <Button>Create New Campaign</Button>
        </Link>
      </div>

      {campaigns.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">
                      {campaign.title}
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {campaign.sport}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-2 ${
                      campaign.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : campaign.status === 'draft'
                        ? 'bg-gray-100 text-gray-800'
                        : campaign.status === 'completed'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {campaign.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Goal:</span>
                    <span className="font-semibold">
                      ${campaign.fundraisingGoal.toString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Grid:</span>
                    <span className="font-semibold">
                      {campaign.gridRows} × {campaign.gridCols} ({campaign._count.gridSquares} squares)
                    </span>
                  </div>
                  <div className="space-y-2 mt-4">
                    <div className="flex gap-2">
                      <Link href={`/dashboard/campaigns/${campaign.id}`} className="flex-1">
                        <Button variant="outline" className="w-full">
                          Manage
                        </Button>
                      </Link>
                      <Link href={`/give/${campaign.slug}`} className="flex-1">
                        <Button className="w-full">View Page</Button>
                      </Link>
                    </div>
                    {campaign.status !== 'draft' && (
                      <QuickShareButton campaignSlug={campaign.slug} campaignTitle={campaign.title} />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No campaigns yet
          </h3>
          <p className="text-gray-600 mb-6">
            Create your first fundraising campaign to get started
          </p>
          <Link href="/dashboard/campaigns/new">
            <Button size="lg">Create Campaign</Button>
          </Link>
        </div>
      )}
    </div>
  )
}
