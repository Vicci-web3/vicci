import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { Topics } from '@vic/shared'

interface CreateCampaignBody {
  protocol: string
  objective: string
  rewardToken: string
  rewardType: string
  amount: string // BigInt will be converted from string
  validUntil: string // DateTime will be converted from ISO string
}

interface RouteParams {
  id: string
}

const campaigns: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.post<{ Body: CreateCampaignBody }>('/', async function (
    request: FastifyRequest<{ Body: CreateCampaignBody }>,
    reply: FastifyReply
  ) {
    const campaign = await fastify.prisma.campaign.create({
      data: {
        ...request.body,
        amount: BigInt(request.body.amount),
        validUntil: new Date(request.body.validUntil)
      }
    })

    // Notify indexer about new campaign
    await fastify.messageBus.publish(Topics.NEW_CAMPAIGN, campaign)

    return campaign
  })

  fastify.get('/', async function (
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    return fastify.prisma.campaign.findMany({
      include: {
        permits: true
      }
    })
  })

  fastify.get<{ Params: RouteParams }>('/:id', async function (
    request: FastifyRequest<{ Params: RouteParams }>,
    reply: FastifyReply
  ) {
    const { id } = request.params
    return fastify.prisma.campaign.findUnique({
      where: { id },
      include: {
        permits: true
      }
    })
  })
}

export default campaigns 