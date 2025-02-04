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

class IndexerAgent implements Agent {
  public readonly config: IndexerAgentConfig
  private metrics: AgentMetrics
  private messageBus: MessageBus
  public readonly llm: Cohere
  private lastIndexedBlock: number = 0  // Initialize with 0
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
      pollInterval: 30000,
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
      tableName: 'position_embeddings'
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
    this.lastIndexedBlock = this.config.startBlock || state.lastIndexed

    console.log(`Starting ${this.config.id} from block ${this.lastIndexedBlock}`)
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
        chainId: this.config.chainId,
        lastIndexed: 0  // Start from block 0 or specify a starting block
      }
    })
  }

  private async updateIndexerState(blockNumber: number) {
    return prisma.indexerState.update({
      where: {
        chainId: this.config.chainId
      },
      data: {
        lastIndexed: blockNumber  // Now we store the actual block number
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
    setInterval(async () => {
      try {
        const currentBlock = await getCurrentBlock(this.config.chainId)
        
        if (currentBlock > this.lastIndexedBlock + this.config.indexingInterval) {
          const fromBlock = this.lastIndexedBlock + 1
          const toBlock = Math.min(
            this.lastIndexedBlock + this.config.indexingInterval,
            currentBlock
          )

          await this.indexBlockRange(fromBlock, toBlock)
          await this.updateMetrics(true)

          // Publish outputs defined in config
          for (const output of this.config.outputs) {
            await this.messageBus.publish(`${this.config.id}.${output}`, {
              blockRange: [fromBlock, toBlock],
              data: {} // Add relevant data for each output type
            })
          }
        }
      } catch (error) {
        await this.updateMetrics(false)
        console.error('Error during indexing:', error)
      }
    }, this.config.pollInterval)
  }

  private async vectorizePosition(position: any): Promise<Document> {
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

  private async indexBlockRange(fromBlock: number, toBlock: number) {
    try {
      const result = await execute(GetMergedPositionsDocument, {})
      const positions = result.mergedPositions || []

      // Store position embeddings
      const documents = await Promise.all(
        positions.map(p => this.vectorizePosition(p))
      )
      await this.vectorStore.addDocuments(documents)

      // Get LLM analysis
      const insight = await this.analyzePositions(positions)

      await this.messageBus.publish(Topics.INDEXER_EVENT, {
        blockNumber: toBlock,
        timestamp: new Date().toISOString(),
        status: 'indexed',
        data: {
          fromBlock,
          toBlock,
          positions,
          insight
        }
      })

    } catch (error) {
      console.error(`Error indexing block range ${fromBlock}-${toBlock}:`, error)
      
      await this.messageBus.publish(Topics.INDEXER_EVENT, {
        blockNumber: fromBlock,
        timestamp: new Date().toISOString(),
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        data: {
          fromBlock,
          toBlock
        }
      })
    }
  }

  private async analyzePositions(positions: any[]): Promise<PositionInsight> {
    const response = await this.llm.call(
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