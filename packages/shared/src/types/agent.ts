import { BaseLanguageModel } from '@langchain/core/language_models/base'

export interface AgentConfig {
    id: string
    responsibilities: string[]
    outputs: string[]
    inputs?: string[]
    dependencies?: string[]  // Other agent IDs this agent depends on
    llmConfig?: {
      model: string
      temperature?: number
      maxTokens?: number
    }
}

export interface AgentMetrics {
    status: 'active' | 'idle' | 'error'
    lastActive: Date
    processedItems: number
    successRate: number
    errorRate: number
}

// Base interface all agents implement
export interface Agent {
    readonly config: AgentConfig
    readonly metrics: AgentMetrics
    readonly llm: BaseLanguageModel
    start(): Promise<void>
    stop(): Promise<void>
    getStatus(): Promise<AgentMetrics>
}