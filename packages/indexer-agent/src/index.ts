// @ts-nocheck
import 'dotenv/config'
import { MessageBus, Topics } from './messageBus'
import { PromptTemplate } from '@langchain/core/prompts'
import { Document } from '@langchain/core/documents'
import { PGVectorStore } from '@langchain/community/vectorstores/pgvector'
import { getCurrentBlock } from './utils/chain'
import prisma from './services/prisma'
import { GetMergedPositionsDocument, execute } from '../.graphclient'
import { Cohere } from '@langchain/cohere'
import { CohereEmbeddings } from '@langchain/cohere'


// Create a single shared MessageBus instance
const messageBus = new MessageBus(process.env.RABBITMQ_URL || 'amqp://localhost')

interface IndexerAgentConfig {
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

interface ChatMessage {
  type: 'user' | 'assistant'
  role: 'venue' | 'visitor'
  content: string
  timestamp: string
}

interface RAGQueryResponse {
  response: string
  confidence: number
  relevantDocs: {
    content: string
    metadata: any
  }[]
}

class IndexerAgent {
  public readonly config: IndexerAgentConfig
  private metrics
  private readonly llm: Cohere
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
      // 15 seconds in ms
      pollInterval: 1000 * 60 * 60 * 2,
      llmConfig: {
        model: 'command',  // Cohere's latest model
        temperature: 0.7,
        maxTokens: 1000
      }
    }

    this.config = { ...defaultConfig, ...customConfig }
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
    
    // Connect to shared message bus
    console.log('\n=== Connecting to Shared Message Bus ===')
    await messageBus.connect()
    console.log('✓ Successfully connected to message bus')
    
    // Announce agent startup
    await messageBus.publish(Topics.AGENT_STATUS, {
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

    // Set up message handlers first
    await this.setupChatMessageHandler()
    
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
      await messageBus.close()
      process.exit(0)
    }

    process.on('SIGTERM', shutdown)
    process.on('SIGINT', shutdown)
  }

  private async setupChatMessageHandler() {
    console.log('\n=== Setting up IndexerAgent Message Handlers ===');
    
    // Handle chat messages
    console.log('Subscribing to CHAT_MESSAGE topic...');
    await messageBus.subscribe(Topics.CHAT_MESSAGE, async (message: ChatMessage) => {
      try {
        console.log('\n=== Processing New Chat Message for RAG ===')
        console.log('Message Type:', message.type)
        console.log('Role:', message.role)
        console.log('Timestamp:', message.timestamp)
        console.log('Content:', message.content)

        // Create a document from the chat message
        const document = new Document({
          pageContent: message.content,
          metadata: {
            type: message.type,
            role: message.role,
            timestamp: message.timestamp
          }
        })

        console.log('\nVectorizing Chat Message:')
        console.log('Document:', {
          content: document.pageContent,
          metadata: document.metadata
        })

        // Add to vector store
        await this.vectorStore.addDocuments([document])
        console.log('✓ Successfully added chat message to vector store')

        // Update metrics
        await this.updateMetrics(true)
        console.log('✓ Updated metrics')
        console.log('=== Finished Processing Chat Message ===\n')
      } catch (error) {
        console.error('Error processing chat message:', error)
        await this.updateMetrics(false)
      }
    });
    console.log('✓ Successfully subscribed to CHAT_MESSAGE topic');

    // Handle visitor queries for RAG-enhanced responses
    console.log('\nSubscribing to VISITOR_QUERY topic...');
    await messageBus.subscribe(Topics.VISITOR_QUERY, async (query: { visitorId: string, content: string }) => {
      try {
        console.log('\n=== Processing Visitor Query for RAG ===')
        console.log('Visitor ID:', query.visitorId)
        console.log('Query Content:', query.content)
        
        const response = await this.generateRAGResponse(query.content)
        console.log('\nGenerated RAG Response:')
        console.log('Confidence Score:', response.confidence)
        console.log('Number of Supporting Docs:', response.relevantDocs.length)
        console.log('Response:', response.response)
        
        // Send response back to visitor agent
        await messageBus.publish(Topics.VISITOR_RESPONSE, {
          visitorId: query.visitorId,
          ...response
        })
        console.log('✓ Published response to visitor agent')

        await this.updateMetrics(true)
        console.log('✓ Updated metrics')
        console.log('=== Finished Processing Visitor Query ===\n')
      } catch (error) {
        console.error('Error processing visitor query:', error)
        await this.updateMetrics(false)
      }
    });
    console.log('✓ Successfully subscribed to VISITOR_QUERY topic');
    console.log('=== Message Handlers Setup Complete ===\n');
  }

  private async generateRAGResponse(query: string): Promise<RAGQueryResponse> {
    console.log('\n=== Generating RAG Response ===')
    console.log('Query:', query)

    // Search for relevant documents with increased context
    console.log('\nSearching Vector Store...')
    const relevantDocs = await this.vectorStore.similaritySearch(query, 8);
    console.log(`Found ${relevantDocs.length} relevant documents`)
    
    // Separate documents by type for better context organization
    const chatHistory = relevantDocs.filter(doc => 
      doc.metadata.type === 'user' || doc.metadata.type === 'assistant'
    );
    console.log(`Chat History Documents: ${chatHistory.length}`)
    
    const positionData = relevantDocs.filter(doc => 
      doc.metadata.positionId !== undefined
    );
    console.log(`Position Data Documents: ${positionData.length}`)

    // Log document summaries
    console.log('\nChat History Summary:')
    chatHistory.forEach((doc, i) => {
      console.log(`${i + 1}. ${doc.metadata.role} (${doc.metadata.type}) at ${doc.metadata.timestamp}`)
      console.log(`   Content: ${doc.pageContent.substring(0, 100)}...`)
    })

    console.log('\nPosition Data Summary:')
    positionData.forEach((doc, i) => {
      console.log(`${i + 1}. Position ${doc.metadata.positionId} on Chain ${doc.metadata.chainId}`)
      console.log(`   Content: ${doc.pageContent.substring(0, 100)}...`)
    })

    // Format context with clear sections
    console.log('\nFormatting Context...')
    const context = `
      VISITOR CHAT HISTORY:
      ${chatHistory.map(doc => `
        Role: ${doc.metadata.role} (${doc.metadata.type})
        Time: ${doc.metadata.timestamp}
        Content: ${doc.pageContent}
      `).join('\n\n')}

      RELEVANT ONCHAIN POSITION DATA:
      ${positionData.map(doc => `
        Position ID: ${doc.metadata.positionId}
        Chain: ${doc.metadata.chainId}
        Time: ${doc.metadata.timestamp}
        Details: ${doc.pageContent}
      `).join('\n\n')}
    `;

    // Enhanced prompt for Cohere
    console.log('\nGenerating Cohere Prompt...')
    const prompt = `
      You are an expert blockchain data analyst and visitor counsellor. Your task is to provide 
      data-driven insights and recommendations based on the visitor's query and available context.

      CURRENT QUERY: ${query}

      AVAILABLE CONTEXT:
      ${context}

      ANALYSIS INSTRUCTIONS:
      1. Historical Interaction Analysis:
         - Review past visitor interactions
         - Identify key themes and preferences
         - Note any specific blockchain interests or concerns

      2. Onchain Data Analysis:
         - Analyze relevant position data
         - Identify patterns in liquidity movements
         - Note any relevant market trends

      3. Synthesized Insights:
         - Combine chat history and onchain data
         - Draw connections between visitor interests and market activity
         - Identify opportunities based on both datasets

      4. Personalized Recommendations:
         - Provide specific, actionable recommendations
         - Support each recommendation with data points
         - Consider both historical preferences and current market conditions

      Please provide a response that:
      1. Demonstrates clear understanding of the visitor's interests from chat history
      2. Incorporates relevant onchain data to support recommendations
      3. Offers specific, actionable advice backed by data
      4. Maintains a helpful and informative tone
      5. Prioritizes insights that are most relevant to the current query

      Format your response in clear sections:
      1. Context Summary (brief recap of relevant history)
      2. Data-Driven Insights (key findings from analysis)
      3. Personalized Recommendations (specific actionable items)
      4. Supporting Evidence (relevant data points)
    `;

    // Get response from Cohere
    console.log('\nInvoking Cohere...')
    const response = await this.llm.invoke(prompt);
    console.log('✓ Received response from Cohere')

    // Calculate confidence based on amount and relevance of supporting data
    console.log('\nCalculating Confidence Score...')
    const confidence = this.calculateConfidence(relevantDocs, query);
    console.log('Final Confidence Score:', confidence)

    console.log('=== Finished Generating RAG Response ===\n')

    return {
      response: response,
      confidence,
      relevantDocs: relevantDocs.map(doc => ({
        content: doc.pageContent,
        metadata: doc.metadata
      }))
    };
  }

  private calculateConfidence(docs: Document[], query: string): number {
    // Base confidence starts at 0.5
    let confidence = 0.5;

    // Increase confidence based on number of relevant documents (up to 0.2)
    confidence += Math.min(docs.length / 20, 0.2);

    // Increase confidence if we have recent documents (up to 0.15)
    const hasRecentDocs = docs.some(doc => {
      const docTime = new Date(doc.metadata.timestamp).getTime();
      const hoursSinceDoc = (Date.now() - docTime) / (1000 * 60 * 60);
      return hoursSinceDoc < 24;
    });
    if (hasRecentDocs) confidence += 0.15;

    // Increase confidence if we have both chat history and position data (up to 0.15)
    const hasChatHistory = docs.some(doc => doc.metadata.type === 'user' || doc.metadata.type === 'assistant');
    const hasPositionData = docs.some(doc => doc.metadata.positionId !== undefined);
    if (hasChatHistory && hasPositionData) confidence += 0.15;

    return Math.min(confidence, 1.0);
  }
}

// Start the agent
const agent = new IndexerAgent()
agent.start().catch((error) => {
  console.error('Failed to start indexer agent:', error)
  process.exit(1)
}) 