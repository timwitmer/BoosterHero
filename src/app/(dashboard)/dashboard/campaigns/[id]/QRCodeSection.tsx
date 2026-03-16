'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface QRCodeSectionProps {
  campaignSlug: string
  campaignTitle: string
}

export default function QRCodeSection({ campaignSlug, campaignTitle }: QRCodeSectionProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const campaignUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/give/${campaignSlug}`

  // Generate QR code preview on mount
  useEffect(() => {
    generatePreview()
  }, [campaignSlug])

  const generatePreview = async () => {
    try {
      // Import QRCode dynamically (client-side only)
      const QRCode = (await import('qrcode')).default

      const dataUrl = await QRCode.toDataURL(campaignUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#2563eb',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      })

      setQrCodeUrl(dataUrl)
    } catch (err) {
      console.error('QR preview error:', err)
      setError('Failed to generate preview')
    }
  }

  const handleDownload = async () => {
    setIsGenerating(true)
    setError(null)

    try {
      const response = await fetch(`/api/campaigns/${campaignSlug}/qr-code`)

      if (!response.ok) {
        throw new Error('Failed to download QR code')
      }

      // Create blob and download
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gridgive-${campaignSlug}-qr.png`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(campaignUrl)
    alert('Campaign URL copied to clipboard!')
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: campaignTitle,
          text: `Support my fundraiser: ${campaignTitle}`,
          url: campaignUrl,
        })
      } catch (err) {
        // User cancelled share
      }
    } else {
      handleCopyUrl()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share Your Campaign</CardTitle>
        <CardDescription>
          Download your QR code or share the campaign link with supporters
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {/* QR Code Preview */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">QR Code</h4>
            <div className="bg-white border-2 border-gray-200 rounded-lg p-4 flex items-center justify-center">
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="Campaign QR Code"
                  className="w-full max-w-[256px] h-auto"
                />
              ) : (
                <div className="w-64 h-64 flex items-center justify-center text-gray-400">
                  Loading QR code...
                </div>
              )}
            </div>
            <Button
              onClick={handleDownload}
              disabled={isGenerating}
              className="w-full mt-4"
            >
              {isGenerating ? 'Downloading...' : 'Download QR Code (PNG)'}
            </Button>
            {error && (
              <p className="text-sm text-red-600 mt-2">{error}</p>
            )}
          </div>

          {/* Campaign URL */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Campaign Link</h4>
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-sm text-gray-600 mb-1">Your unique campaign URL:</p>
                <code className="text-sm text-blue-600 break-all">
                  {campaignUrl}
                </code>
              </div>

              <div className="space-y-2">
                <Button
                  onClick={handleCopyUrl}
                  variant="outline"
                  className="w-full"
                >
                  Copy Link
                </Button>

                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="w-full"
                >
                  Share Campaign
                </Button>
              </div>

              <div className="pt-4 border-t">
                <h5 className="font-semibold text-sm text-gray-900 mb-2">
                  Sharing Tips:
                </h5>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li>Print the QR code on flyers or posters</li>
                  <li>Share the link on social media</li>
                  <li>Send via text or email to supporters</li>
                  <li>Display the QR code at team events</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
