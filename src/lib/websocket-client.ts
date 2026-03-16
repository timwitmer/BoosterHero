/**
 * WebSocket Client for API Routes
 *
 * Allows API routes to broadcast WebSocket events to connected clients
 */

const WEBSOCKET_API_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001'

interface BroadcastOptions {
  campaignSlug: string
  event: 'grid_updated' | 'stats_updated' | 'campaign_updated'
  data: any
}

/**
 * Broadcast event to all clients in a campaign room
 */
export async function broadcastToRoom({ campaignSlug, event, data }: BroadcastOptions) {
  try {
    const response = await fetch(`${WEBSOCKET_API_URL}/broadcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        room: campaignSlug,
        event,
        data,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to broadcast event')
    }

    console.log(`✅ Broadcast ${event} to ${campaignSlug}`)
  } catch (error) {
    console.error('❌ Broadcast failed:', error)
    // Don't throw - WebSocket failures shouldn't break the main flow
  }
}

/**
 * Broadcast grid update
 */
export async function broadcastGridUpdate(campaignSlug: string, squares: any[]) {
  return broadcastToRoom({
    campaignSlug,
    event: 'grid_updated',
    data: { squares },
  })
}

/**
 * Broadcast stats update
 */
export async function broadcastStatsUpdate(campaignSlug: string, stats: any) {
  return broadcastToRoom({
    campaignSlug,
    event: 'stats_updated',
    data: { stats },
  })
}

/**
 * Broadcast campaign update
 */
export async function broadcastCampaignUpdate(campaignSlug: string, campaign: any) {
  return broadcastToRoom({
    campaignSlug,
    event: 'campaign_updated',
    data: { campaign },
  })
}
