'use client'

import { useState, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { Grid } from '@/components/grid/Grid'
import { GridStats } from '@/components/grid/GridStats'
import { CheckoutModal } from '@/components/payment/CheckoutModal'
import { Button } from '@/components/ui/button'
import { useGrid } from '@/hooks/useGrid'
import { useWebSocket } from '@/hooks/useWebSocket'

interface CampaignClientProps {
  campaign: {
    id: string
    slug: string
    title: string
    description: string | null
    sport: string
    teamName: string | null
    schoolName: string | null
    athletePhotoUrl: string | null
    fundraisingGoal: string
    gridRows: number
    gridCols: number
    status: string
    athlete: {
      name: string
      firstName: string
      lastName: string
    }
  }
}

export default function CampaignClient({ campaign }: CampaignClientProps) {
  const [selectedSquareIds, setSelectedSquareIds] = useState<string[]>([])
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [viewerCount, setViewerCount] = useState(0)

  // Fetch grid state with polling
  const { squares, stats, isLoading, error, refresh, updateSquares } = useGrid({
    campaignSlug: campaign.slug,
    pollInterval: 5000, // Poll every 5 seconds as fallback
  })

  // Periodically release expired locks (client-side trigger for development)
  useEffect(() => {
    const releaseExpiredLocks = async () => {
      try {
        await fetch('/api/cron/release-locks')
      } catch (err) {
        // Silent fail - this is a background task
      }
    }

    // Run immediately on mount
    releaseExpiredLocks()

    // Run every 2 minutes while component is mounted
    const interval = setInterval(releaseExpiredLocks, 2 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  // WebSocket for real-time updates (disabled until server is set up)
  const { isConnected } = useWebSocket({
    campaignSlug: campaign.slug,
    enabled: false, // Disabled - WebSocket server not running yet
    onGridUpdated: (data) => {
      console.log('Received grid update via WebSocket')
      updateSquares(data.squares)
      refresh() // Also refresh stats
    },
    onStatsUpdated: (data) => {
      console.log('Received stats update via WebSocket')
      refresh()
    },
    onConnectionCount: (count) => {
      setViewerCount(count)
    },
  })

  const handleSquaresSelected = useCallback((squareIds: string[]) => {
    setSelectedSquareIds(squareIds)
  }, [])

  const handleDonateClick = () => {
    if (selectedSquareIds.length === 0) {
      alert('Please select at least one square')
      return
    }
    setIsCheckoutOpen(true)
  }

  const handlePaymentSuccess = () => {
    setSelectedSquareIds([])
    setIsCheckoutOpen(false)
    refresh() // Refresh grid after successful payment
  }

  // Get selected squares data
  const selectedSquares = squares.filter(s => selectedSquareIds.includes(s.id))

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <a href="/" className="text-2xl font-bold text-blue-600">
            GridGive
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Campaign Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Athlete Photo */}
              {campaign.athletePhotoUrl && (
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-blue-500 flex-shrink-0">
                  <Image
                    src={campaign.athletePhotoUrl}
                    alt={campaign.athlete.name}
                    width={128}
                    height={128}
                    className="object-cover"
                  />
                </div>
              )}

              {/* Campaign Info */}
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  {campaign.title}
                </h1>
                <div className="flex flex-wrap gap-3 text-sm text-gray-600 mb-4">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
                    </svg>
                    {campaign.athlete.name}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {campaign.schoolName || 'Local School'}
                  </span>
                  {campaign.teamName && (
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                      {campaign.teamName}
                    </span>
                  )}
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold uppercase">
                    {campaign.sport}
                  </span>
                </div>
                {campaign.description && (
                  <p className="text-gray-700 leading-relaxed">
                    {campaign.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Real-time indicators */}
          <div className="mb-4 flex items-center gap-4">
            {isConnected && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>Live updates active</span>
              </div>
            )}
            {viewerCount > 1 && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path
                    fillRule="evenodd"
                    d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{viewerCount} viewing now</span>
              </div>
            )}
          </div>

          {/* Grid and Stats Layout */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Grid (2/3 width on large screens) */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Select Your Squares
                </h2>

                {isLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                      <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent mb-4" />
                      <p className="text-gray-600">Loading grid...</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800">{error}</p>
                    <button
                      onClick={refresh}
                      className="mt-2 text-sm text-red-600 hover:underline"
                    >
                      Try again
                    </button>
                  </div>
                ) : (
                  <>
                    <Grid
                      squares={squares}
                      rows={campaign.gridRows}
                      cols={campaign.gridCols}
                      campaignSlug={campaign.slug}
                      onSquaresSelected={handleSquaresSelected}
                    />

                    {/* Donate Button */}
                    {selectedSquareIds.length > 0 && (
                      <div className="mt-6">
                        <Button
                          onClick={handleDonateClick}
                          size="lg"
                          className="w-full text-lg"
                        >
                          Donate - {selectedSquareIds.length} square
                          {selectedSquareIds.length !== 1 ? 's' : ''} selected
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Stats (1/3 width on large screens) */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-lg p-6 sticky top-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Progress
                </h2>
                {!isLoading && (
                  <GridStats
                    totalSquares={stats.totalSquares}
                    soldSquares={stats.squaresSold}
                    totalRaised={stats.totalRaised}
                    fundraisingGoal={parseFloat(campaign.fundraisingGoal)}
                    totalDonors={stats.totalDonors}
                    lastDonationAt={stats.lastDonationAt}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        selectedSquares={selectedSquares}
        campaignSlug={campaign.slug}
        campaignTitle={campaign.title}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </div>
  )
}
