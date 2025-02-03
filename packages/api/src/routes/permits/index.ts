import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { Topics } from '@vic/shared'

interface CreatePermitBody {
  id: string
  campaignId: string
  recipient: string
  signature: string
}

const permits: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.post<{ Body: CreatePermitBody }>('/', async function (
    request: FastifyRequest<{ Body: CreatePermitBody }>,
    reply: FastifyReply
  ) {
    const permit = await fastify.prisma.permit.create({
      data: request.body
    })

    // Notify permit agent about new permit
    await fastify.messageBus.publish(Topics.NEW_PERMIT, permit)

    return permit
  })

  fastify.get('/', async function (
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    return fastify.prisma.permit.findMany({
      include: {
        campaign: true
      }
    })
  })
}

export default permits 