'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { SPORTS } from '@/lib/validations'

export default function NewCampaignPage() {
  const router = useRouter()
  const { user } = useUser()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    sport: 'football',
    teamName: '',
    schoolName: '',
    fundraisingGoal: '1000',
    gridRows: '10',
    gridCols: '10',
    squareValue: '10',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || undefined,
          sport: formData.sport,
          teamName: formData.teamName || undefined,
          schoolName: formData.schoolName || undefined,
          fundraisingGoal: parseFloat(formData.fundraisingGoal),
          gridRows: parseInt(formData.gridRows),
          gridCols: parseInt(formData.gridCols),
          squareValue: parseFloat(formData.squareValue),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create campaign')
      }

      // Redirect to campaign details
      router.push(`/dashboard/campaigns/${data.campaign.id}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const totalSquares = parseInt(formData.gridRows) * parseInt(formData.gridCols)
  const totalValue = totalSquares * parseFloat(formData.squareValue)

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create New Campaign</h1>
        <p className="text-gray-600 mt-2">
          Set up your fundraising campaign in just a few steps
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Tell donors about your fundraising campaign
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Campaign Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="John Doe - Football Fundraiser"
                required
                maxLength={255}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tell your story... Why are you fundraising?"
                className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                maxLength={2000}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sport">Sport *</Label>
                <select
                  id="sport"
                  value={formData.sport}
                  onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {SPORTS.map((sport) => (
                    <option key={sport} value={sport}>
                      {sport.charAt(0).toUpperCase() + sport.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="teamName">Team Name</Label>
                <Input
                  id="teamName"
                  value={formData.teamName}
                  onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                  placeholder="Eagles"
                  maxLength={255}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="schoolName">School Name</Label>
              <Input
                id="schoolName"
                value={formData.schoolName}
                onChange={(e) => setFormData({ ...formData, schoolName: e.target.value })}
                placeholder="Lincoln High School"
                maxLength={255}
              />
            </div>
          </CardContent>
        </Card>

        {/* Fundraising Goal */}
        <Card>
          <CardHeader>
            <CardTitle>Fundraising Goal</CardTitle>
            <CardDescription>
              How much are you trying to raise?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="fundraisingGoal">Goal Amount ($) *</Label>
              <Input
                id="fundraisingGoal"
                type="number"
                value={formData.fundraisingGoal}
                onChange={(e) => setFormData({ ...formData, fundraisingGoal: e.target.value })}
                min="1"
                max="100000"
                step="1"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                This is your fundraising target
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Grid Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Grid Configuration</CardTitle>
            <CardDescription>
              Customize your fundraising grid
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="gridRows">Rows *</Label>
                <Input
                  id="gridRows"
                  type="number"
                  value={formData.gridRows}
                  onChange={(e) => setFormData({ ...formData, gridRows: e.target.value })}
                  min="5"
                  max="20"
                  required
                />
              </div>

              <div>
                <Label htmlFor="gridCols">Columns *</Label>
                <Input
                  id="gridCols"
                  type="number"
                  value={formData.gridCols}
                  onChange={(e) => setFormData({ ...formData, gridCols: e.target.value })}
                  min="5"
                  max="20"
                  required
                />
              </div>

              <div>
                <Label htmlFor="squareValue">Price per Square ($) *</Label>
                <Input
                  id="squareValue"
                  type="number"
                  value={formData.squareValue}
                  onChange={(e) => setFormData({ ...formData, squareValue: e.target.value })}
                  min="1"
                  max="100"
                  step="1"
                  required
                />
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2">Grid Summary</h4>
              <div className="space-y-1 text-sm text-blue-800">
                <p>Total Squares: <span className="font-semibold">{totalSquares}</span></p>
                <p>Price per Square: <span className="font-semibold">${formData.squareValue}</span></p>
                <p className="text-lg font-bold mt-2">
                  Maximum Raise: ${totalValue.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex gap-4">
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? 'Creating...' : 'Create Campaign'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => router.push('/dashboard')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
