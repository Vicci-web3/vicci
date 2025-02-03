export const Topics = {
  NEW_CAMPAIGN: 'campaign.new',
  INDEXER_EVENT: 'indexer.new_event',
  BATCH_COMPLETE: 'indexer.batch_complete',
  ANALYSIS_REQUEST: 'analysis.request'
} as const;

export type Topics = keyof typeof Topics;

export interface Campaign {
  id: string;
  protocol: string;
  objective: string;
  rewardToken: string;
  rewardType: string;
  amount: string;
  validUntil: string;
}

export interface IndexerEvent {
  chainId?: number;
  blockNumber?: number;
  timestamp: string;
  address?: string;
  eventType?: 'transaction' | 'contract_interaction' | 'token_transfer';
  data?: Record<string, unknown>;
  campaignId?: string;
  status?: string;
  error?: string;
}

export interface AnalysisResult {
  // Add analysis result properties
}

export interface TargetingResult {
  // Add targeting result properties
}

export interface RetryConfig {
  maxRetries: number;
  backoffMs: number;
  maxBackoffMs: number;
}

export interface MessageMetadata {
  timestamp: string;
  correlationId: string;
  producer: string;
  version: string;
}

export interface Message<T> {
  topic: string;
  payload: T;
  metadata: MessageMetadata;
}

export interface MessageWithRetry<T> extends Message<T> {
  retryCount?: number;
}

export interface TopicPayloadMap {
  [Topics.NEW_CAMPAIGN]: Campaign;
  [Topics.INDEXER_EVENT]: IndexerEvent;
  [Topics.BATCH_COMPLETE]: { blockRange: [number, number] };
  [Topics.ANALYSIS_REQUEST]: { address: string; timeframe: string };
}