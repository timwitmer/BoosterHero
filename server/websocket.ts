/**
 * WebSocket Server for Real-Time Updates
 *
 * Handles:
 * - Campaign room management
 * - Grid update broadcasting
 * - Statistics updates
 * - Connection tracking
 */

import { Server } from 'socket.io'
import { createServer } from 'http'

const PORT = process.env.WEBSOCKET_PORT ? parseInt(process.env.WEBSOCKET_PORT) : 3001

// Create HTTP server with request handler
const httpServer = createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.writeHead(200)
    res.end()
    return
  }

  // Broadcast endpoint
  if (req.method === 'POST' && req.url === '/broadcast') {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
    })
    req.on('end', () => {
      try {
        const { room, event, data } = JSON.parse(body)

        if (!room || !event) {
          res.writeHead(400)
          res.end(JSON.stringify({ error: 'Missing room or event' }))
          return
        }

        // Broadcast to room
        io.to(room).emit(event, data)
        console.log(`📢 Broadcasted ${event} to room: ${room}`)

        res.writeHead(200)
        res.end(JSON.stringify({ success: true }))
      } catch (error) {
        console.error('Broadcast error:', error)
        res.writeHead(500)
        res.end(JSON.stringify({ error: 'Internal server error' }))
      }
    })
    return
  }

  // Health check endpoint
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200)
    res.end(JSON.stringify({ status: 'ok', connections: io.engine.clientsCount }))
    return
  }

  // 404 for other routes
  res.writeHead(404)
  res.end(JSON.stringify({ error: 'Not found' }))
})

// Create Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})

// Track active connections per campaign
const campaignConnections = new Map<string, Set<string>>()

io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`)

  // Join campaign room
  socket.on('join_campaign', ({ campaignSlug }: { campaignSlug: string }) => {
    if (!campaignSlug) {
      console.log('❌ Invalid campaign slug')
      return
    }

    console.log(`📥 ${socket.id} joining campaign: ${campaignSlug}`)

    // Join the room
    socket.join(campaignSlug)

    // Track connection
    if (!campaignConnections.has(campaignSlug)) {
      campaignConnections.set(campaignSlug, new Set())
    }
    campaignConnections.get(campaignSlug)!.add(socket.id)

    // Send connection count to all in room
    const connectionCount = campaignConnections.get(campaignSlug)!.size
    io.to(campaignSlug).emit('connection_count', connectionCount)

    console.log(`👥 Campaign ${campaignSlug} now has ${connectionCount} viewer(s)`)

    // Acknowledge join
    socket.emit('joined_campaign', { campaignSlug, connectionCount })
  })

  // Leave campaign room
  socket.on('leave_campaign', ({ campaignSlug }: { campaignSlug: string }) => {
    if (!campaignSlug) return

    console.log(`📤 ${socket.id} leaving campaign: ${campaignSlug}`)

    socket.leave(campaignSlug)

    // Update tracking
    if (campaignConnections.has(campaignSlug)) {
      campaignConnections.get(campaignSlug)!.delete(socket.id)

      const connectionCount = campaignConnections.get(campaignSlug)!.size

      if (connectionCount === 0) {
        campaignConnections.delete(campaignSlug)
      } else {
        // Update connection count for remaining viewers
        io.to(campaignSlug).emit('connection_count', connectionCount)
      }

      console.log(`👥 Campaign ${campaignSlug} now has ${connectionCount} viewer(s)`)
    }
  })

  // Heartbeat to keep connection alive
  socket.on('heartbeat', () => {
    socket.emit('heartbeat_ack')
  })

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`❌ Client disconnected: ${socket.id} (${reason})`)

    // Remove from all campaign rooms
    campaignConnections.forEach((connections, campaignSlug) => {
      if (connections.has(socket.id)) {
        connections.delete(socket.id)

        const connectionCount = connections.size

        if (connectionCount === 0) {
          campaignConnections.delete(campaignSlug)
        } else {
          // Update connection count
          io.to(campaignSlug).emit('connection_count', connectionCount)
        }

        console.log(`👥 Campaign ${campaignSlug} now has ${connectionCount} viewer(s)`)
      }
    })
  })
})

// Export io instance for use in API routes
export { io }

// Broadcast functions (can be called from API routes)
export function broadcastGridUpdate(campaignSlug: string, data: any) {
  console.log(`📢 Broadcasting grid update to campaign: ${campaignSlug}`)
  io.to(campaignSlug).emit('grid_updated', data)
}

export function broadcastStatsUpdate(campaignSlug: string, data: any) {
  console.log(`📢 Broadcasting stats update to campaign: ${campaignSlug}`)
  io.to(campaignSlug).emit('stats_updated', data)
}

export function broadcastCampaignUpdate(campaignSlug: string, data: any) {
  console.log(`📢 Broadcasting campaign update to: ${campaignSlug}`)
  io.to(campaignSlug).emit('campaign_updated', data)
}

// Start server
httpServer.listen(PORT, () => {
  console.log('🚀 WebSocket server started')
  console.log(`📡 Listening on port ${PORT}`)
  console.log(`🔗 CORS origin: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}`)
  console.log('✅ Ready to accept connections')
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, closing WebSocket server...')
  httpServer.close(() => {
    console.log('✅ WebSocket server closed')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('📴 SIGINT received, closing WebSocket server...')
  httpServer.close(() => {
    console.log('✅ WebSocket server closed')
    process.exit(0)
  })
})
