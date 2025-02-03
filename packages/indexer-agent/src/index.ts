import 'dotenv/config'
import { MessageBus, Topics } from '@vic/shared'
import { getCurrentBlock } from './utils/chain'
import prisma from './services/prisma'
import { GetMergedPositionsDocument, execute } from '../.graphclient'
interface IndexerConfig {
  chainId: number
  startBlock?: number
  indexingInterval: number  // Number of blocks per batch
  pollInterval: number      // Ms between checks for new blocks
}

class IndexerAgent {
  private messageBus: MessageBus
  private lastIndexedBlock: number = 0  // Initialize with 0
  private readonly config: IndexerConfig

  constructor(config: IndexerConfig = {
    chainId: 1,  // Default to Ethereum mainnet
    startBlock: undefined,    // Will start from latest if undefined
    indexingInterval: 100,    // Index 100 blocks at a time
    pollInterval: 30000      // Check for new blocks every minute
  }) {
    this.messageBus = new MessageBus()
    this.config = config
  }

  async start() {
    await this.messageBus.connect()
    console.log('Indexer agent started')

    // Get or create indexer state
    const state = await this.getOrCreateIndexerState()
    this.lastIndexedBlock = this.config.startBlock || state.lastIndexed

    console.log(`Starting from block ${this.lastIndexedBlock}`)

    // Start continuous indexing
    await this.setupContinuousIndexing()
    await this.setupShutdown()
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


          // Create indexing task
          const task = await prisma.indexingTask.create({
            data: {
              chainId: this.config.chainId,
              fromBlock,
              toBlock,
              status: 'processing',
              startedAt: new Date()
            }
          })


          const positions = await execute(GetMergedPositionsDocument, {})
          /*
          const positions = await execute(
            `
            {
              positions(
                first: 100
                orderBy: liquidity
                orderDirection: desc
                where: { liquidity_gt: "0" }
              ) {
                id
                owner
                liquidity
              }
            }
            `
          )
            */
          console.log(positions)

          try {
            console.log(`Indexing blocks ${fromBlock} to ${toBlock}`)
            await this.indexBlockRange(fromBlock, toBlock)
            console.log(positions)
            // Update task status
            await prisma.indexingTask.update({
              where: { id: task.id },
              data: {
                status: 'completed',
                completedAt: new Date()
              }
            })

            // Update last indexed block
            await this.updateIndexerState(toBlock)

            // Publish batch completion event
            await this.messageBus.publish(Topics.BATCH_COMPLETE, {
              blockRange: [fromBlock, toBlock]
            })
          } catch (error) {
            // Update task status on error
            await prisma.indexingTask.update({
              where: { id: task.id },
              data: {
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
                completedAt: new Date()
              }
            })
            throw error
          }
        }
      } catch (error) {
        console.error('Error during indexing:', error)
      }
    }, this.config.pollInterval)
  }

  private async indexBlockRange(fromBlock: number, toBlock: number) {
    try {
      // TODO: Implement indexing logic here
      // - Query subgraphs for data in block range
      // - Process and validate data
      // - Store or forward results as needed
      
      await this.messageBus.publish(Topics.INDEXER_EVENT, {
        blockNumber: toBlock,
        timestamp: new Date().toISOString(),
        status: 'indexed',
        data: {
          fromBlock,
          toBlock
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