'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface PauseCampaignButtonProps {
  campaignSlug: string
}

export default function PauseCampaignButton({ campaignSlug }: PauseCampaignButtonProps) {
  const router = useRouter()
  const [isPausing, setIsPausing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePause = async () => {
    if (!confirm('Are you sure you want to pause this campaign? Donors will not be able to purchase squares while paused.')) {
      return
    }

    setIsPausing(true)
    setError(null)

    try {
      const response = await fetch(`/api/campaigns/${campaignSlug}/pause`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to pause campaign')
      }

      // Refresh the page to show updated status
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsPausing(false)
    }
  }

  return (
    <div>
      <Button onClick={handlePause} disabled={isPausing} variant="outline">
        {isPausing ? 'Pausing...' : 'Pause Campaign'}
      </Button>
      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </div>
  )
}
