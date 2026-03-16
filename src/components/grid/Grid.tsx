'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { GridSquare } from './GridSquare'
import { formatCurrency } from '@/lib/utils'

export interface GridSquareData {
  id: string
  positionX: number
  positionY: number
  squareValue: string
  status: 'available' | 'pending' | 'sold'
  donorName?: string
  donorInitials?: string
}

interface GridProps {
  squares: GridSquareData[]
  rows: number
  cols: number
  campaignSlug: string
  onSquaresSelected?: (selectedIds: string[]) => void
  readOnly?: boolean
}

export function Grid({
  squares,
  rows,
  cols,
  campaignSlug,
  onSquaresSelected,
  readOnly = false,
}: GridProps) {
  const [selectedSquares, setSelectedSquares] = useState<Set<string>>(new Set())
  const [containerWidth, setContainerWidth] = useState(0)
  const isInitialMount = useRef(true)

  // Calculate optimal square size based on container width
  const squareSize = useMemo(() => {
    if (containerWidth === 0) return 60 // Default

    const maxWidth = containerWidth - 40 // Account for padding
    const calculatedSize = Math.floor(maxWidth / cols)

    // Min 40px, max 100px
    return Math.max(40, Math.min(100, calculatedSize))
  }, [containerWidth, cols])

  const gridWidth = cols * squareSize
  const gridHeight = rows * squareSize

  // Handle responsive sizing
  useEffect(() => {
    const updateSize = () => {
      const container = document.getElementById('grid-container')
      if (container) {
        setContainerWidth(container.offsetWidth)
      }
    }

    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

  // Notify parent when selection changes (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false
      return
    }

    if (onSquaresSelected) {
      onSquaresSelected(Array.from(selectedSquares))
    }
  }, [selectedSquares, onSquaresSelected])

  // Toggle square selection
  const handleSquareSelect = useCallback((squareId: string) => {
    if (readOnly) return

    setSelectedSquares(prev => {
      const newSelected = new Set(prev)
      if (newSelected.has(squareId)) {
        newSelected.delete(squareId)
      } else {
        newSelected.add(squareId)
      }

      return newSelected
    })
  }, [readOnly])

  // Create a map for quick square lookup
  const squareMap = useMemo(() => {
    const map = new Map<string, GridSquareData>()
    squares.forEach(square => {
      const key = `${square.positionX},${square.positionY}`
      map.set(key, square)
    })
    return map
  }, [squares])

  // Calculate statistics
  const stats = useMemo(() => {
    let availableCount = 0
    let soldCount = 0
    let pendingCount = 0
    let totalValue = 0
    let selectedValue = 0

    squares.forEach(square => {
      const value = parseFloat(square.squareValue)
      totalValue += value

      if (square.status === 'available') availableCount++
      else if (square.status === 'sold') soldCount++
      else if (square.status === 'pending') pendingCount++

      if (selectedSquares.has(square.id)) {
        selectedValue += value
      }
    })

    return {
      total: squares.length,
      available: availableCount,
      sold: soldCount,
      pending: pendingCount,
      totalValue,
      selectedCount: selectedSquares.size,
      selectedValue,
    }
  }, [squares, selectedSquares])

  return (
    <div id="grid-container" className="w-full">
      {/* Selection summary */}
      {!readOnly && selectedSquares.size > 0 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-blue-900">
                {stats.selectedCount} square{stats.selectedCount !== 1 ? 's' : ''} selected
              </p>
              <p className="text-sm text-blue-700">
                Total: {formatCurrency(stats.selectedValue)}
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedSquares(new Set())
                if (onSquaresSelected) onSquaresSelected([])
              }}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      {/* Grid visualization */}
      <div className="flex justify-center overflow-x-auto">
        <svg
          width={gridWidth}
          height={gridHeight}
          viewBox={`0 0 ${gridWidth} ${gridHeight}`}
          className="border border-gray-300 rounded-lg bg-gray-50"
          style={{ maxWidth: '100%', height: 'auto' }}
        >
          {/* Render all squares */}
          {Array.from({ length: rows }, (_, row) =>
            Array.from({ length: cols }, (_, col) => {
              const key = `${col},${row}`
              const square = squareMap.get(key)

              // If square data doesn't exist, render placeholder
              if (!square) {
                return (
                  <rect
                    key={key}
                    x={col * squareSize + 2}
                    y={row * squareSize + 2}
                    width={squareSize - 4}
                    height={squareSize - 4}
                    fill="#f3f4f6"
                    stroke="#d1d5db"
                    strokeWidth={1}
                    rx={4}
                  />
                )
              }

              return (
                <GridSquare
                  key={square.id}
                  id={square.id}
                  positionX={col}
                  positionY={row}
                  value={square.squareValue}
                  status={square.status}
                  donorName={square.donorName}
                  donorInitials={square.donorInitials}
                  isSelected={selectedSquares.has(square.id)}
                  onSelect={handleSquareSelect}
                  squareSize={squareSize}
                />
              )
            })
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-white border-2 border-gray-200 rounded" />
          <span className="text-gray-700">Available ({stats.available})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 border-2 border-green-600 rounded" />
          <span className="text-gray-700">Sold ({stats.sold})</span>
        </div>
        {stats.pending > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-400 border-2 border-yellow-500 rounded" />
            <span className="text-gray-700">Pending ({stats.pending})</span>
          </div>
        )}
        {!readOnly && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 border-2 border-blue-600 rounded" />
            <span className="text-gray-700">Selected ({stats.selectedCount})</span>
          </div>
        )}
      </div>

      {/* Instructions */}
      {!readOnly && stats.available > 0 && (
        <div className="mt-4 text-center text-sm text-gray-600">
          <p>Click squares to select them, then proceed to checkout.</p>
          <p className="text-xs text-gray-500 mt-1">
            Tip: You can select multiple squares at once
          </p>
        </div>
      )}

      {/* All sold message */}
      {stats.available === 0 && stats.pending === 0 && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg text-center">
          <p className="font-semibold text-green-900">
            🎉 All squares have been sold!
          </p>
          <p className="text-sm text-green-700 mt-1">
            This campaign has reached 100% completion
          </p>
        </div>
      )}
    </div>
  )
}
