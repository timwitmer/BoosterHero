'use client'

import { useState, useEffect, useCallback } from 'react'
import { GridSquareData } from '@/components/grid/Grid'

interface UseGridOptions {
  campaignSlug: string
  pollInterval?: number // milliseconds, 0 to disable polling
}

interface GridState {
  squares: GridSquareData[]
  stats: {
    totalSquares: number
    squaresSold: number
    squaresAvailable: number
    totalRaised: number
    totalDonors: number
    completionPercentage: number
    lastDonationAt?: string
  }
  isLoading: boolean
  error: string | null
}

export function useGrid({ campaignSlug, pollInterval = 5000 }: UseGridOptions) {
  const [state, setState] = useState<GridState>({
    squares: [],
    stats: {
      totalSquares: 0,
      squaresSold: 0,
      squaresAvailable: 0,
      totalRaised: 0,
      totalDonors: 0,
      completionPercentage: 0,
    },
    isLoading: true,
    error: null,
  })

  const fetchGrid = useCallback(async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignSlug}/grid`)

      if (!response.ok) {
        throw new Error('Failed to fetch grid state')
      }

      const data = await response.json()

      setState(prev => ({
        ...prev,
        squares: data.squares || [],
        stats: data.stats || prev.stats,
        isLoading: false,
        error: null,
      }))
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message,
      }))
    }
  }, [campaignSlug])

  // Initial fetch
  useEffect(() => {
    fetchGrid()
  }, [fetchGrid])

  // Polling (if enabled)
  useEffect(() => {
    if (pollInterval <= 0) return

    const interval = setInterval(fetchGrid, pollInterval)
    return () => clearInterval(interval)
  }, [fetchGrid, pollInterval])

  // Manual refresh function
  const refresh = useCallback(() => {
    setState(prev => ({ ...prev, isLoading: true }))
    fetchGrid()
  }, [fetchGrid])

  // Update squares (for optimistic UI updates)
  const updateSquares = useCallback((updatedSquares: GridSquareData[]) => {
    setState(prev => ({ ...prev, squares: updatedSquares }))
  }, [])

  return {
    ...state,
    refresh,
    updateSquares,
  }
}
