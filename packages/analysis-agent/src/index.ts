import { MessageBus, Topics } from '@vic/shared'

class AnalysisAgent {
  private messageBus: MessageBus

  constructor() {
    this.messageBus = new MessageBus()
  }

  async start() {
    await this.messageBus.connect()
    console.log('Analysis agent started')

    await this.messageBus.subscribe(Topics.INDEXER_EVENT, async (event) => {
      console.log('Processing indexed data:', event)
      try {
        // Analyze user behaviors and patterns
        // Send results to targeting agent
        await this.messageBus.publish(Topics.ANALYSIS_COMPLETE, {
          campaignId: event.campaignId,
          analysis: {
            // Add analysis results
          }
        })
      } catch (error) {
        console.error('Analysis error:', error)
      }
    })
  }
}

new AnalysisAgent().start().catch(console.error) 