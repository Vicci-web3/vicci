export const EventType = {
  NEW_CAMPAIGN: 'campaign.new',
  INDEXER_EVENT: 'indexer.new_event',
  BATCH_COMPLETE: 'indexer.batch_complete',
  ANALYSIS_REQUEST: 'analysis.request',
  ANALYSIS_COMPLETE: 'analysis.complete',
  TARGETING_COMPLETE: 'targeting.complete',
  AGENT_STATUS: 'agent.status'
} as const

export type EventType = typeof EventType[keyof typeof EventType] 