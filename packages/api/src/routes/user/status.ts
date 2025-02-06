import { FastifyPluginAsync } from 'fastify'

const status: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get('/', async function (request, reply) {
    const { address } = request.query as { address: string }
    
    if (!address) {
      return reply.status(400).send({ error: 'Address is required' })
    }

    try {
      console.log('Checking status for address:', address)

      // Check if user is a venue
      const venue = await fastify.prisma.venue.findUnique({
        where: { address: address.toLowerCase() }
      })

      console.log('Venue lookup result:', venue)

      if (venue) {
        return reply.send({ type: 'venue' })
      }

      // Check if user is a visitor
      const visitor = await fastify.prisma.visitor.findUnique({
        where: { address: address.toLowerCase() }
      })

      console.log('Visitor lookup result:', visitor)

      if (visitor) {
        return reply.send({ type: 'visitor' })
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