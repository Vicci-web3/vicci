import { MessageBus, Topics } from '@vic/shared'
import { PrismaClient } from '@prisma/client'

async function main() {
  const messageBus = new MessageBus()
  const prisma = new PrismaClient()
  
  await messageBus.connect()

  console.log('Permit agent started')
  
  // Listen for indexed campaigns
  await messageBus.subscribe(Topics.INDEXER_EVENT, async (message) => {
    console.log('Processing indexed campaign:', message)
    if (message.status === 'indexed') {
      // Update campaign status or process permits
      await prisma.campaign.update({
        where: { id: message.campaignId },
        data: { 
          // Add your status update logic
        }
      })
    }
  })

  // Listen for new permits
  await messageBus.subscribe(Topics.NEW_PERMIT, async (message) => {
    console.log('Processing new permit:', message)
    try {
      await prisma.permit.create({
        data: message
      })
      await messageBus.publish(Topics.PERMIT_CLAIMED, {
        permitId: message.id,
        status: 'processed'
      })
    } catch (error) {
      console.error('Error processing permit:', error)
      throw error
    }
  })

  // Handle process shutdown
  process.on('SIGTERM', async () => {
    await messageBus.close()
    await prisma.$disconnect()
    process.exit(0)
  })
}

main().catch(console.error) 