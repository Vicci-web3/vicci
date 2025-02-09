// @ts-nocheck
import { FastifyPluginAsync } from 'fastify'

interface CreateCampaignBody {
  protocol: string
  objective: string
  rewardToken: string
  rewardType: string
  amount: string // BigInt will be converted from string
  validUntil: string // DateTime will be converted from ISO string
}

const campaigns: FastifyPluginAsync = async (fastify): Promise<void> => {
  // Create campaign
  fastify.post('/', {
    schema: {
      body: {
        type: 'object',
        required: ['protocol', 'objective', 'rewardToken', 'rewardType', 'amount', 'validUntil'],
        properties: {
          protocol: { type: 'string' },
          objective: { type: 'string' },
          rewardToken: { type: 'string' },
          rewardType: { type: 'string' },
          amount: { type: 'string' },
          validUntil: { type: 'string' }
        }
      }
    }
  }, async function (request, reply) {
    const { address } = request.cookies.siwe ? JSON.parse(request.cookies.siwe) : {}
    if (!address) {
      return reply.status(401).send({ error: 'Not authenticated' })
    }

    // Get venue ID for the authenticated user
    const venue = await fastify.prisma.venue.findUnique({
      where: { address: address.toLowerCase() }
    })

    if (!venue) {
      return reply.status(403).send({ error: 'Not authorized' })
    }

    try {
      const campaign = await fastify.prisma.campaign.create({
        data: {
          ...request.body as CreateCampaignBody,
          venueId: venue.id,
          amount: BigInt(request.body.amount),
          validUntil: new Date(request.body.validUntil)
        }
      })

      return reply.send(campaign)
    } catch (error) {
      console.error('Campaign creation error:', error)
      return reply.status(500).send({ error: 'Failed to create campaign' })
    }
  })

  // Get all campaigns for venue
  fastify.get('/', async function (request, reply) {
    const { address } = request.cookies.siwe ? JSON.parse(request.cookies.siwe) : {}
    if (!address) {
      return reply.status(401).send({ error: 'Not authenticated' })
    }

    const venue = await fastify.prisma.venue.findUnique({
      where: { address: address.toLowerCase() }
    })

    if (!venue) {
      return reply.status(403).send({ error: 'Not authorized' })
    }

    const campaigns = await fastify.prisma.campaign.findMany({
      where: { venueId: venue.id },
      include: {
        permits: true
      }
    })

    return reply.send(campaigns)
  })
}

export default campaigns 