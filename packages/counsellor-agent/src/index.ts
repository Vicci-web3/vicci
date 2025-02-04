import { MessageBus, Topics } from '@vic/shared'

class TargetingAgent {
  private messageBus: MessageBus

  constructor() {
    this.messageBus = new MessageBus()
  }

  async start() {
    await this.messageBus.connect()
    console.log('Targeting agent started')

    await this.messageBus.subscribe(Topics.ANALYSIS_COMPLETE, async (data) => {
      console.log('Processing analysis results:', data)
      try {
        // Match users to protocol criteria
        // Send matches to permit generation
        await this.messageBus.publish(Topics.TARGETING_COMPLETE, {
          campaignId: data.campaignId,
          matches: [
            // Add matched users
          ]
        })
      } catch (error) {
        console.error('Targeting error:', error)
      }
    })
  }
}

new TargetingAgent().start().catch(console.error) 