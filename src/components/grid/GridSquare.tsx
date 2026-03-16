'use client'

import { formatCurrency, getInitials } from '@/lib/utils'

interface GridSquareProps {
  id: string
  positionX: number
  positionY: number
  value: string
  status: 'available' | 'pending' | 'sold'
  donorName?: string
  donorInitials?: string
  isSelected: boolean
  onSelect: (id: string) => void
  squareSize: number
}

export function GridSquare({
  id,
  positionX,
  positionY,
  value,
  status,
  donorName,
  donorInitials,
  isSelected,
  onSelect,
  squareSize,
}: GridSquareProps) {
  const handleClick = () => {
    if (status === 'available') {
      onSelect(id)
    }
  }

  // Calculate position
  const x = positionX * squareSize
  const y = positionY * squareSize
  const padding = 2

  // Determine colors based on status
  const getColors = () => {
    if (status === 'sold') {
      return {
        fill: '#10b981', // green-500
        stroke: '#059669', // green-600
        text: '#ffffff',
      }
    }
    if (status === 'pending') {
      return {
        fill: '#fbbf24', // yellow-400
        stroke: '#f59e0b', // yellow-500
        text: '#78350f',
      }
    }
    if (isSelected) {
      return {
        fill: '#3b82f6', // blue-500
        stroke: '#2563eb', // blue-600
        text: '#ffffff',
      }
    }
    return {
      fill: '#ffffff',
      stroke: '#e5e7eb', // gray-200
      text: '#6b7280', // gray-500
    }
  }

  const colors = getColors()
  const isClickable = status === 'available'

  // Display text
  const displayText = status === 'sold'
    ? (donorInitials || getInitials(donorName || 'Unknown'))
    : formatCurrency(parseFloat(value))

  return (
    <g
      onClick={handleClick}
      className={isClickable ? 'cursor-pointer' : 'cursor-not-allowed'}
      style={{ transition: 'all 0.2s ease' }}
    >
      {/* Square background */}
      <rect
        x={x + padding}
        y={y + padding}
        width={squareSize - padding * 2}
        height={squareSize - padding * 2}
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={isSelected ? 3 : 1.5}
        rx={4}
        style={{
          transition: 'all 0.2s ease',
        }}
      />

      {/* Hover effect (only for available squares) */}
      {isClickable && (
        <rect
          x={x + padding}
          y={y + padding}
          width={squareSize - padding * 2}
          height={squareSize - padding * 2}
          fill="rgba(59, 130, 246, 0.1)"
          stroke="none"
          rx={4}
          className="opacity-0 hover:opacity-100"
          style={{ transition: 'opacity 0.2s ease', pointerEvents: 'none' }}
        />
      )}

      {/* Display text (price or initials) */}
      <text
        x={x + squareSize / 2}
        y={y + squareSize / 2}
        fill={colors.text}
        fontSize={squareSize > 60 ? '14' : '12'}
        fontWeight={status === 'sold' ? 'bold' : 'normal'}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {displayText}
      </text>

      {/* Sold indicator (checkmark) */}
      {status === 'sold' && squareSize > 50 && (
        <g transform={`translate(${x + squareSize - 18}, ${y + 8})`}>
          <circle r="8" fill="white" opacity="0.9" />
          <path
            d="M -3 0 L -1 2 L 3 -2"
            stroke="#10b981"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}

      {/* Selected indicator (checkmark in corner) */}
      {isSelected && status === 'available' && squareSize > 50 && (
        <g transform={`translate(${x + squareSize - 18}, ${y + 8})`}>
          <circle r="8" fill="white" opacity="0.9" />
          <path
            d="M -3 0 L -1 2 L 3 -2"
            stroke="#3b82f6"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}

      {/* Pending spinner */}
      {status === 'pending' && squareSize > 50 && (
        <g transform={`translate(${x + squareSize / 2}, ${y + squareSize / 2 + 15})`}>
          <circle
            r="6"
            fill="none"
            stroke="#78350f"
            strokeWidth="2"
            strokeDasharray="18.84"
            strokeLinecap="round"
            opacity="0.7"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 0 0"
              to="360 0 0"
              dur="1s"
              repeatCount="indefinite"
            />
          </circle>
        </g>
      )}
    </g>
  )
}
