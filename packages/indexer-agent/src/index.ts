import { MessageBus, Topics } from '@vic/shared'

interface Campaign {
  id: string
  protocol: string
  objective: string
  rewardToken: string
  rewardType: string
  amount: string
  validUntil: string
}

class IndexerAgent {
  private messageBus: MessageBus

  constructor() {
    this.messageBus = new MessageBus()
  }

  async start() {
    await this.messageBus.connect()
    console.log('Indexer agent started')

    await this.setupSubscriptions()
    await this.setupShutdown()
  }

  private async setupSubscriptions() {
    // Listen for new campaigns
    await this.messageBus.subscribe(Topics.NEW_CAMPAIGN, async (campaign: Campaign) => {
      console.log('New campaign to index:', campaign)
      
      try {
        // Add your indexing logic here
        // For example:
        // - Query The Graph for relevant data
        // - Process and validate campaign data
        // - Update campaign status
        
        await this.messageBus.publish(Topics.INDEXER_EVENT, {
          campaignId: campaign.id,
          status: 'indexed',
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        console.error('Error processing campaign:', error)
        
        await this.messageBus.publish(Topics.INDEXER_EVENT, {
          campaignId: campaign.id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        })
      }
    })
  }

  private async setupShutdown() {
    process.on('SIGTERM', async () => {
      console.log('Shutting down indexer agent...')
      await this.messageBus.close()
      process.exit(0)
    })

    process.on('SIGINT', async () => {
      console.log('Shutting down indexer agent...')
      await this.messageBus.close()
      process.exit(0)
    })
  }
}

// Start the agent
const agent = new IndexerAgent()
agent.start().catch((error) => {
  console.error('Failed to start indexer agent:', error)
  process.exit(1)
}) 