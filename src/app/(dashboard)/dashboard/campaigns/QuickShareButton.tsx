'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface QuickShareButtonProps {
  campaignSlug: string
  campaignTitle: string
}

export default function QuickShareButton({ campaignSlug, campaignTitle }: QuickShareButtonProps) {
  const [copied, setCopied] = useState(false)

  const campaignUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/give/${campaignSlug}`

  const handleShare = async () => {
    // Try native share first
    if (navigator.share) {
      try {
        await navigator.share({
          title: campaignTitle,
          text: `Support my fundraiser: ${campaignTitle}`,
          url: campaignUrl,
        })
        return
      } catch (err) {
        // User cancelled or share not supported, fall back to copy
      }
    }

    // Fallback to copy
    try {
      await navigator.clipboard.writeText(campaignUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <Button
      onClick={handleShare}
      variant="ghost"
      size="sm"
      className="text-xs"
    >
      {copied ? 'Copied!' : 'Share'}
    </Button>
  )
}
