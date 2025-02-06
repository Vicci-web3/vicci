import { FastifyPluginAsync } from 'fastify'

const status: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get('/', async function (request, reply) {
    const { address } = request.query as { address: string }
    
    if (!address) {
      return reply.status(400).send({ error: 'Address is required' })
    }

    try {
      // Check visitor first
      const visitor = await fastify.prisma.visitor.findUnique({
        where: { address: address.toLowerCase() }
      })

      if (visitor) {
        return reply.send({ type: 'visitor' })
      }

      // Check venue if not a visitor
      const venue = await fastify.prisma.venue.findUnique({
        where: { address: address.toLowerCase() }
      })

      if (venue) {
        return reply.send({ type: 'venue' })
      }

      // If neither, return null type
      return reply.send({ type: null })
    } catch (error) {
      console.error('Status check error:', error)
      return reply.status(500).send({ error: 'Failed to check registration status' })
    }
  })
}

export default status 