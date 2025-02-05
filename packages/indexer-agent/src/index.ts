import 'dotenv/config'
import { MessageBus, Topics, Agent, AgentConfig, AgentMetrics } from '@vic/shared'
import { PromptTemplate } from '@langchain/core/prompts'
import { Document } from '@langchain/core/documents'
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector'
import { getCurrentBlock } from './utils/chain'
import prisma from './services/prisma'
import { GetMergedPositionsDocument, execute } from '../.graphclient'
import { Cohere } from '@langchain/cohere'
import { CohereEmbeddings } from '@langchain/cohere'


interface IndexerAgentConfig extends AgentConfig {
  id: string
  chainId: number
  startBlock?: number
  indexingInterval: number  // Number of blocks per batch
  pollInterval: number      // Ms between checks for new blocks
  llmConfig: {
    model: string
    temperature: number
    maxTokens: number
  }
}

interface PositionInsight {
  pattern: string
  significance: string
  recommendation: string
  confidence: number
}

interface MergedPosition {
  id: string
  owner: string
  liquidity: string
  // Add other fields from your GraphQL schema
}

interface GraphQLResult {
  mergedPositions: MergedPosition[]
}

class IndexerAgent implements Agent {
  public readonly config: IndexerAgentConfig
  private metrics: AgentMetrics
  private messageBus: MessageBus
  public readonly llm: Cohere
  private lastIndexedPositions: Set<string> = new Set()
  private paginationRound: number = 0
  private readonly MAX_ROUNDS = 20  // Will cover 100 positions total (5 x 4 sources x 5 rounds)
  private vectorStore: PGVectorStore
  private embeddings: CohereEmbeddings
  private positionAnalysisPrompt: PromptTemplate

  constructor(customConfig?: Partial<IndexerAgentConfig>) {
    // Default configuration with responsibilities and outputs
    const defaultConfig: IndexerAgentConfig = {
      id: 'indexer-agent',
      responsibilities: [
        'Monitor blockchain for new blocks',
        'Index LP positions across DEXes',
        'Track cross-chain liquidity movements',
        'Maintain real-time position data'
      ],
      outputs: [
        'raw-position-data',
        'wallet-activity',
        'liquidity-events',
        'cross-chain-movements'
      ],
      inputs: [],  // Indexer is usually the first in the pipeline
      dependencies: [],
      chainId: 1,
      indexingInterval: 100,
      // 2 hours in ms = 1000ms * 60s * 60m * 2h
      pollInterval: 1000 * 60 * 60 * 2,
      llmConfig: {
        model: 'command',  // Cohere's latest model
        temperature: 0.7,
        maxTokens: 1000
      }
    }

    this.config = { ...defaultConfig, ...customConfig }
    this.messageBus = new MessageBus()
    this.metrics = this.initializeMetrics()
    this.llm = new Cohere({
      apiKey: process.env.COHERE_API_KEY,
      model: this.config.llmConfig?.model,
      temperature: this.config.llmConfig?.temperature
    })

    this.embeddings = new CohereEmbeddings({
      apiKey: process.env.COHERE_API_KEY,
      model: 'embed-english-v3.0'  // 1024 dimensions, good balance of quality/speed
    })

    // Initialize vector store with Postgres
    this.vectorStore = new PGVectorStore(this.embeddings, {
      postgresConnectionOptions: {
        connectionString: process.env.DATABASE_URL,
      },
      tableName: 'position_embeddings',
      createTableIfNotExists: true
    })

    this.positionAnalysisPrompt = PromptTemplate.fromTemplate(`
      Analyze these DEX liquidity positions and identify patterns:
      Position Data: {positionData}
      
      Focus on:
      1. Cross-chain liquidity movements
      2. Large position changes
      3. Correlated movements between Uniswap and Sushiswap
      4. Potential arbitrage signals
      
      Provide analysis in this format:
      Pattern: (one line description)
      Significance: (market impact)
      Recommendation: (actionable insight)
    `)
  }

  private initializeMetrics(): AgentMetrics {
    return {
      status: 'idle',
      lastActive: new Date(),
      processedItems: 0,
      successRate: 1,
      errorRate: 0
    }
  }

  async start() {
    this.metrics.status = 'active'
    await this.messageBus.connect()
    
    // Announce agent startup
    await this.messageBus.publish(Topics.AGENT_STATUS, {
      agentId: this.config.id,
      status: 'started',
      config: this.config,
      timestamp: new Date()
    })

    // Get or create indexer state
    const state = await this.getOrCreateIndexerState()
    this.lastIndexedPositions = new Set(state.lastIndexedPositions || [])

    console.log(`Starting ${this.config.id} from positions: ${JSON.stringify(Array.from(this.lastIndexedPositions))}`)
    console.log('Responsibilities:', this.config.responsibilities)
    console.log('Outputs:', this.config.outputs)

    await this.setupContinuousIndexing()
    await this.setupShutdown()
  }

  async getStatus(): Promise<AgentMetrics> {
    return this.metrics
  }

  private async getOrCreateIndexerState() {
    const state = await prisma.indexerState.findFirst({
      where: { chainId: this.config.chainId }
    })

    if (state) return state

    // Create initial state
    return prisma.indexerState.create({
      data: {
        id: `chain-${this.config.chainId}`,  // Generate a unique ID
        chainId: this.config.chainId,
        lastIndexedPositions: []
      }
    })
  }

  private async updateIndexerState(blockNumber: number) {
    return prisma.indexerState.update({
      where: {
        chainId: this.config.chainId
      },
      data: {
        lastIndexedPositions: Array.from(this.lastIndexedPositions)
      }
    })
  }

  private async updateMetrics(success: boolean) {
    this.metrics.processedItems++
    this.metrics.lastActive = new Date()
    
    // Update rolling success/error rates
    const weight = 0.95 // Weighting for exponential moving average
    if (success) {
      this.metrics.successRate = 
        (this.metrics.successRate * weight) + (1 - weight)
      this.metrics.errorRate = this.metrics.errorRate * weight
    } else {
      this.metrics.errorRate = 
        (this.metrics.errorRate * weight) + (1 - weight)
      this.metrics.successRate = this.metrics.successRate * weight
    }
  }

  private async setupContinuousIndexing() {
    // Track all positions we've seen in this cycle
    let cyclePositions = new Set<string>()

    setInterval(async () => {
      try {
        console.log(`\n--- Indexing Round ${this.paginationRound + 1}/${this.MAX_ROUNDS} ---`)
        
        if (this.paginationRound >= this.MAX_ROUNDS) {
          console.log('Completed full indexing cycle, resetting pagination')
          this.paginationRound = 0
          // Reset cycle tracking
          cyclePositions = new Set()
        }

        const skip = this.paginationRound * 5
        console.log(`Fetching positions (skip: ${skip}, first: 5)`)

        const result = await execute(GetMergedPositionsDocument, {}, {skip, first: 5})

        console.log('GraphQL result:', JSON.stringify(result, null, 2))

        if (!result || !result.data) {
          console.error('Invalid GraphQL response:', result)
          throw new Error('Failed to fetch positions from GraphQL')
        }

        const positions = (result.data as GraphQLResult).mergedPositions || []
        console.log(`Fetched ${positions.length} positions`)

        // Only track new positions we haven't seen before in this cycle
        const newPositions = positions.filter(p => !cyclePositions.has(p.id))
        
        if (newPositions.length > 0) {
          console.log('\nProcessing new positions:')
          console.log(newPositions.map(p => `${p.id} (${p.owner})`).join('\n'))

          console.log('\nVectorizing positions...')
          const documents = await Promise.all(newPositions.map(p => this.vectorizePosition(p)))
          console.log(`Created ${documents.length} vector documents`)

          console.log('Adding to vector store...')
          await this.vectorStore.addDocuments(documents)
        }

        // Add current positions to cycle tracking
        positions.forEach(p => cyclePositions.add(p.id))

        this.paginationRound++
        await this.updateMetrics(true)
        
      } catch (error) {
        console.error('Error in indexing round:', error)
        if (error instanceof Error) {
          console.error('Stack trace:', error.stack)
        }
        await this.updateMetrics(false)
      }
    }, this.config.pollInterval)
  }

  private async vectorizePosition(position: MergedPosition): Promise<Document> {
    console.log(`\nVectorizing position ${position.id}:`)
    console.log(`Owner: ${position.owner}`)
    console.log(`Liquidity: ${position.liquidity}`)

    const text = `
      Position ID: ${position.id}
      Owner: ${position.owner}
      Liquidity: ${position.liquidity}
      Chain: ${this.config.chainId}
      Timestamp: ${new Date().toISOString()}
    `

    return new Document({
      pageContent: text,
      metadata: {
        positionId: position.id,
        chainId: this.config.chainId,
        timestamp: new Date().toISOString()
      }
    })
  }

  private async analyzePositions(positions: MergedPosition[]): Promise<PositionInsight> {
    const response = await this.llm.invoke(
      await this.positionAnalysisPrompt.format({
        positionData: JSON.stringify(positions, null, 2)
      })
    )

    const [pattern, significance, recommendation] = response.split('\n')
    
    return {
      pattern: pattern.replace('Pattern: ', ''),
      significance: significance.replace('Significance: ', ''),
      recommendation: recommendation.replace('Recommendation: ', ''),
      confidence: 0.9 // Claude tends to be well-calibrated
    }
  }

  private async setupShutdown() {
    const shutdown = async () => {
      console.log('Shutting down indexer agent...')
      await this.messageBus.close()
      process.exit(0)
    }

    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)
  }
}

// Start the agent
const agent = new IndexerAgent()
agent.start().catch((error) => {
  console.error('Failed to start indexer agent:', error)
  process.exit(1)
}) 