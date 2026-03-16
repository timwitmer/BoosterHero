import { Campaign, GridSquare, Transaction, User } from '@prisma/client'

// Extended types with relations
export type CampaignWithRelations = Campaign & {
  user: User
  gridSquares?: GridSquareWithPurchase[]
  _count?: {
    gridSquares: number
    transactions: number
  }
}

export type GridSquareWithPurchase = GridSquare & {
  purchasedSquares?: Array<{
    donorName: string
    donorInitials: string | null
  }>
}

export type TransactionWithRelations = Transaction & {
  campaign: Campaign
  purchasedSquares?: Array<{
    square: GridSquare
  }>
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface CampaignStats {
  totalSquares: number
  squaresSold: number
  squaresAvailable: number
  totalRaised: number
  totalDonors: number
  completionPercentage: number
  lastDonationAt?: string
}

export interface GridStateResponse {
  campaign: CampaignWithRelations
  squares: GridSquare[]
  stats: CampaignStats
}

// WebSocket event types
export interface WebSocketEvent {
  type: 'grid_updated' | 'stats_updated' | 'campaign_updated' | 'connection_count'
  payload: any
}

export interface GridUpdatedEvent {
  type: 'grid_updated'
  payload: {
    campaignSlug: string
    squares: GridSquare[]
  }
}

export interface StatsUpdatedEvent {
  type: 'stats_updated'
  payload: {
    campaignSlug: string
    stats: CampaignStats
  }
}

// Payment types
export interface PaymentOrderRequest {
  lockToken: string
  donorEmail: string
  donorName: string
}

export interface PaymentOrderResponse {
  orderId: string
  approvalUrl: string
}

export interface PaymentCaptureRequest {
  orderId: string
}

export interface PaymentCaptureResponse {
  transactionId: string
  status: string
  amount: number
}

// Lock types
export interface LockSquaresRequest {
  squareIds: string[]
}

export interface LockSquaresResponse {
  success: boolean
  lockToken: string
  lockedSquares: GridSquare[]
  failedSquares: string[]
  totalAmount: string
  expiresAt: string
}

// Campaign form types
export interface CampaignFormData {
  title: string
  description?: string
  sport: string
  teamName?: string
  schoolName?: string
  fundraisingGoal: number
  gridRows: number
  gridCols: number
  athletePhotoUrl?: string
}

// User context type
export interface UserContext {
  userId: string
  email: string
  firstName: string
  lastName: string
  role: string
  profileImageUrl?: string
}
