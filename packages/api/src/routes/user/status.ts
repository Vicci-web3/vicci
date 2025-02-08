import { FastifyPluginAsync } from 'fastify'

const status: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get('/', async function (request, reply) {
    const { address } = request.query as { address: string }
    
    if (!address) {
      return reply.status(400).send({ error: 'Address is required' })
    }

    try {
      console.log('Checking status for address:', address)
      const normalizedAddress = address.toLowerCase()

      // Check both venue and visitor status
      const [venue, visitor] = await Promise.all([
        fastify.prisma.venue.findUnique({
          where: { address: normalizedAddress }
        }),
        fastify.prisma.visitor.findUnique({
          where: { address: normalizedAddress }
        })
      ])

      console.log('Lookup results:', { venue, visitor })

      // Return array of roles the user has
      const roles = []
      if (venue) roles.push('venue')
      if (visitor) roles.push('visitor')

      return reply.send({ roles })
    } catch (error) {
      console.error('Status check error:', error)
      return reply.status(500).send({ error: 'Failed to check registration status' })
    }
  })
}

export default status 