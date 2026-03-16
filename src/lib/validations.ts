import { z } from 'zod'

// Campaign validations
export const createCampaignSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(255),
  description: z.string().max(2000).optional(),
  sport: z.string().min(1, 'Sport is required'),
  teamName: z.string().max(255).optional(),
  schoolName: z.string().max(255).optional(),
  fundraisingGoal: z.number().min(1, 'Goal must be at least $1').max(100000),
  gridRows: z.number().int().min(1).max(50).default(10),
  gridCols: z.number().int().min(1).max(50).default(10),
  athletePhotoUrl: z.string().url().optional(),
  squareValue: z.number().min(1).max(100).optional(), // Added for campaign creation
})

export const updateCampaignSchema = createCampaignSchema.partial()

// Grid locking validations
export const lockSquaresSchema = z.object({
  squareIds: z.array(z.string().uuid()).min(1, 'At least one square required').max(100),
})

// Payment validations
export const createPaymentOrderSchema = z.object({
  lockToken: z.string().min(1, 'Lock token required'),
  donorEmail: z.string().email('Invalid email'),
  donorName: z.string().min(1, 'Name required').max(255),
})

export const capturePaymentOrderSchema = z.object({
  orderId: z.string().min(1, 'Order ID required'),
})

// Transaction validations
export const donorInfoSchema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(1, 'Name required').max(255),
})

// Square value options (in dollars)
export const SQUARE_VALUES = [1, 5, 10, 25, 50] as const
export type SquareValue = typeof SQUARE_VALUES[number]

// Sport options
export const SPORTS = [
  'football',
  'basketball',
  'soccer',
  'baseball',
  'softball',
  'volleyball',
  'track',
  'cross-country',
  'wrestling',
  'swimming',
  'tennis',
  'golf',
  'lacrosse',
  'hockey',
  'cheerleading',
] as const
export type Sport = typeof SPORTS[number]

// Campaign status
export const CAMPAIGN_STATUS = ['draft', 'active', 'paused', 'completed'] as const
export type CampaignStatus = typeof CAMPAIGN_STATUS[number]

// Grid square status
export const SQUARE_STATUS = ['available', 'pending', 'sold'] as const
export type SquareStatus = typeof SQUARE_STATUS[number]

// Transaction status
export const TRANSACTION_STATUS = ['pending', 'completed', 'failed', 'refunded'] as const
export type TransactionStatus = typeof TRANSACTION_STATUS[number]
