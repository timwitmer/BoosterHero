'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

interface WebSocketOptions {
  campaignSlug: string
  onGridUpdated?: (data: any) => void
  onStatsUpdated?: (data: any) => void
  onConnectionCount?: (count: number) => void
  enabled?: boolean
}

export function useWebSocket({
  campaignSlug,
  onGridUpdated,
  onStatsUpdated,
  onConnectionCount,
  enabled = true,
}: WebSocketOptions) {
  const socketRef = useRef<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return

    const wsUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'http://localhost:3001'

    try {
      // Connect to WebSocket server
      const socket = io(wsUrl, {
        transports: ['websocket', 'polling'],
        reconnection: false, // Disable auto-reconnect to avoid console spam when server is down
        timeout: 2000, // Faster timeout
      })

      socketRef.current = socket

      // Connection events
      socket.on('connect', () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        setError(null)

        // Join campaign room
        socket.emit('join_campaign', { campaignSlug })
      })

      socket.on('disconnect', () => {
        console.log('WebSocket disconnected')
        setIsConnected(false)
      })

      socket.on('connect_error', (err) => {
        // Silently handle connection errors when WebSocket server is not available
        setError('Failed to connect to real-time server')
        setIsConnected(false)
      })

      // Campaign events
      socket.on('grid_updated', (data) => {
        console.log('Grid updated:', data)
        if (onGridUpdated) {
          onGridUpdated(data)
        }
      })

      socket.on('stats_updated', (data) => {
        console.log('Stats updated:', data)
        if (onStatsUpdated) {
          onStatsUpdated(data)
        }
      })

      socket.on('connection_count', (count) => {
        console.log('Active viewers:', count)
        if (onConnectionCount) {
          onConnectionCount(count)
        }
      })

      // Cleanup
      return () => {
        if (socket.connected) {
          socket.emit('leave_campaign', { campaignSlug })
          socket.disconnect()
        }
      }
    } catch (err: any) {
      console.error('WebSocket setup error:', err)
      setError(err.message)
    }
  }, [enabled, campaignSlug, onGridUpdated, onStatsUpdated, onConnectionCount])

  // Manual emit function
  const emit = useCallback((event: string, data: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
    }
  }, [])

  return {
    isConnected,
    error,
    emit,
  }
}
