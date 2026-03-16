'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface ActivateCampaignButtonProps {
  campaignSlug: string
  currentStatus: string
}

export default function ActivateCampaignButton({ campaignSlug, currentStatus }: ActivateCampaignButtonProps) {
  const router = useRouter()
  const [isActivating, setIsActivating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isReactivating = currentStatus === 'paused'
  const buttonText = isReactivating ? 'Reactivate Campaign' : 'Activate Campaign'
  const loadingText = isReactivating ? 'Reactivating...' : 'Activating...'
  const confirmMessage = isReactivating
    ? 'Are you sure you want to reactivate this campaign? Donors will be able to purchase squares again.'
    : 'Are you sure you want to activate this campaign? Once activated, it will be visible to donors.'

  const handleActivate = async () => {
    if (!confirm(confirmMessage)) {
      return
    }

    setIsActivating(true)
    setError(null)

    try {
      const response = await fetch(`/api/campaigns/${campaignSlug}/activate`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to activate campaign')
      }

      // Refresh the page to show updated status
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsActivating(false)
    }
  }

  return (
    <div>
      <Button onClick={handleActivate} disabled={isActivating}>
        {isActivating ? loadingText : buttonText}
      </Button>
      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
    </div>
  )
}
