import QRCode from 'qrcode'

/**
 * Generate QR code as data URL
 */
export async function generateQRCodeDataURL(url: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(url, {
      width: 512,
      margin: 2,
      color: {
        dark: '#2563eb', // Blue color
        light: '#ffffff', // White background
      },
      errorCorrectionLevel: 'H', // High error correction
    })
    return dataUrl
  } catch (error) {
    console.error('QR code generation error:', error)
    throw new Error('Failed to generate QR code')
  }
}

/**
 * Generate QR code as buffer (for saving to file/storage)
 */
export async function generateQRCodeBuffer(url: string): Promise<Buffer> {
  try {
    const buffer = await QRCode.toBuffer(url, {
      width: 1024,
      margin: 2,
      color: {
        dark: '#2563eb',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
    return buffer
  } catch (error) {
    console.error('QR code generation error:', error)
    throw new Error('Failed to generate QR code')
  }
}

/**
 * Generate campaign QR code URL
 */
export function getCampaignQRCodeUrl(campaignSlug: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/give/${campaignSlug}`
}
