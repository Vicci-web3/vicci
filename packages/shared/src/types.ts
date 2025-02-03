export interface Campaign {
  id: string
  protocol: string
  objective: string
  rewardToken: string
  rewardType: string
  amount: string
  validUntil: string
}

export interface IndexerEvent {
  campaignId: string
  status: 'indexed' | 'error'
  error?: string
  timestamp: string
}

export interface AnalysisResult {
  campaignId: string
  analysis: {
    // Add analysis fields
  }
}

export interface TargetingResult {
  campaignId: string
  matches: Array<{
    address: string
    score: number
  }>
} 