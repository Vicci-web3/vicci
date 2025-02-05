import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { generateNonce, SiweMessage } from 'siwe'

interface RegisterBody {
  message: string
  signature: string
  type: string
  name: string
  email: string
  address: string
}

const register: FastifyPluginAsync = async (fastify): Promise<void> => {
  // Add nonce generation endpoint
  fastify.get('/nonce', async function (
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    return reply
      .header('Content-Type', 'text/plain')
      .send(generateNonce())
  })

  // Add verification endpoint
  fastify.post('/verify', async function (
    request: FastifyRequest<{ Body: { message: string; signature: string } }>,
    reply: FastifyReply
  ) {
    try {
      const { message, signature } = request.body

      const siweMessage = new SiweMessage(message)
      const { success, data: fields } = await siweMessage.verify({ 
        signature,
        domain: request.hostname.split(':')[0],
        nonce: siweMessage.nonce
      })

      console.log('SIWE verification result:', { success, fields })

      if (!success) {
        return reply.status(401).send({ error: 'Invalid signature' })
      }

      return reply.send({ 
        success: true,
        address: fields.address 
      })
    } catch (error) {
      console.error('Verification error:', error)
      return reply.status(401).send({ error: 'Invalid signature' })
    }
  })

  // Registration endpoint
  fastify.post<{ Body: RegisterBody }>('/', async function (
    request: FastifyRequest<{ Body: RegisterBody }>,
    reply: FastifyReply
  ) {
    try {
      const { type, name, email, address } = request.body

      // Create or update based on type
      if (type === 'venue') {
        // Create or update venue in database
        const venue = await fastify.prisma.venue.upsert({
          where: { address },
          update: {
            name,
            email,
            verified: true,
          },
          create: {
            address,
            name,
            email,
            type: 'standard', // Default type
            verified: true,
          },
        })
        return { success: true, venue }
      } else {
        // Create or update visitor in database
        const visitor = await fastify.prisma.visitor.upsert({
          where: { address },
          update: {
            name,
            email,
            type,
            verified: true,
          },
          create: {
            address,
            name,
            email,
            type,
            verified: true,
          },
        })
        return { success: true, visitor }
      }
    } catch (error) {
      console.error('Registration error:', error)
      return reply.status(500).send({ error: 'Registration failed' })
    }
  })
}

export default register