'use client'

import { useMemo } from 'react'
import { formatCurrency, calculateCompletion } from '@/lib/utils'

interface GridStatsProps {
  totalSquares: number
  soldSquares: number
  totalRaised: number
  fundraisingGoal: number
  totalDonors?: number
  lastDonationAt?: string
}

export function GridStats({
  totalSquares,
  soldSquares,
  totalRaised,
  fundraisingGoal,
  totalDonors = 0,
  lastDonationAt,
}: GridStatsProps) {
  const availableSquares = totalSquares - soldSquares
  const completionPercentage = calculateCompletion(soldSquares, totalSquares)
  const goalPercentage = calculateCompletion(totalRaised, fundraisingGoal)

  // Format last donation time
  const lastDonationText = useMemo(() => {
    if (!lastDonationAt) return null

    const date = new Date(lastDonationAt)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return `${Math.floor(diffMins / 1440)}d ago`
  }, [lastDonationAt])

  return (
    <div className="space-y-6">
      {/* Fundraising Progress */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold text-gray-900">
            {formatCurrency(totalRaised)}
          </span>
          <span className="text-sm text-gray-600">
            of {formatCurrency(fundraisingGoal)} goal
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, goalPercentage)}%` }}
          >
            {goalPercentage > 20 && (
              <div className="h-full flex items-center justify-center">
                <span className="text-xs font-semibold text-white">
                  {goalPercentage}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Goal reached indicator */}
        {goalPercentage >= 100 && (
          <div className="mt-2 flex items-center gap-2 text-green-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-semibold">Goal reached!</span>
          </div>
        )}
      </div>

      {/* Grid Completion */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700">
            Grid Completion
          </span>
          <span className="text-sm font-bold text-blue-600">
            {completionPercentage}%
          </span>
        </div>

        {/* Completion bar */}
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-500 ease-out"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
          <span>{soldSquares} of {totalSquares} squares sold</span>
          <span>{availableSquares} available</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Total Donors */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">
            {totalDonors}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            {totalDonors === 1 ? 'Donor' : 'Donors'}
          </div>
        </div>

        {/* Average Donation */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">
            {totalDonors > 0
              ? formatCurrency(totalRaised / totalDonors)
              : formatCurrency(0)
            }
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Avg per donor
          </div>
        </div>
      </div>

      {/* Last donation */}
      {lastDonationText && (
        <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 rounded-lg p-3 border border-blue-100">
          <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Last donation: {lastDonationText}</span>
        </div>
      )}

      {/* Milestones */}
      <div className="space-y-2">
        <div className="text-sm font-semibold text-gray-700 mb-3">
          Milestones
        </div>
        <div className="space-y-1">
          {[25, 50, 75, 100].map(milestone => {
            const reached = completionPercentage >= milestone
            return (
              <div key={milestone} className="flex items-center gap-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border-2 transition-colors ${
                    reached
                      ? 'bg-green-500 border-green-600'
                      : 'bg-white border-gray-300'
                  }`}
                >
                  {reached && (
                    <svg
                      className="w-4 h-4 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <span
                  className={`text-sm ${
                    reached ? 'text-green-600 font-semibold' : 'text-gray-600'
                  }`}
                >
                  {milestone}% Complete
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
