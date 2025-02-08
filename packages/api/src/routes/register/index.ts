import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { generateNonce, SiweMessage } from 'siwe'

interface RegisterBody {
  message: string
  signature: string
  nonce: string
  email: string
  name?: string
  type: 'visitor' | 'venue'
}

function normalizeAddress(address: string): string {
  return address.toLowerCase();
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
  fastify.post('/', {
    schema: {
      body: {
        type: 'object',
        required: ['message', 'signature', 'nonce', 'type'],
        properties: {
          message: { type: 'string' },
          signature: { type: 'string' },
          nonce: { type: 'string' },
          email: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string', enum: ['visitor', 'venue'] }
        }
      }
    }
  }, async function (request, reply) {
    const { message, signature, nonce, email, name, type } = request.body as RegisterBody
    console.log('Registration attempt:', { type, email, name, message: !!message, signature: !!signature })

    try {
      if (!message || !signature || !nonce) {
        console.log('Missing required fields:', { message: !!message, signature: !!signature, nonce: !!nonce })
        return reply.status(400).send({ error: 'Missing required fields' })
      }

      // Verify SIWE message
      const siweMessage = new SiweMessage(message)
      console.log('SIWE Message:', {
        address: siweMessage.address,
        nonce: siweMessage.nonce,
        domain: siweMessage.domain,
        statement: siweMessage.statement
      })

      const { success, data: fields } = await siweMessage.verify({
        signature,
        domain: 'localhost',
        nonce
      })

      console.log('SIWE Verification:', { success, fields })

      if (!success) {
        console.log('SIWE verification failed')
        return reply.status(401).send({ error: 'Invalid signature' })
      }

      const address = fields.address.toLowerCase()
      console.log('Checking existing registration:', { address, type })

      // Check if user already exists
      let existingUser = null
      if (type === 'visitor') {
        existingUser = await fastify.prisma.visitor.findUnique({
          where: { address }
        })
      } else {
        existingUser = await fastify.prisma.venue.findUnique({
          where: { address }
        })
      }

      console.log('Existing user check:', { existingUser })

      if (existingUser) {
        return reply.status(400).send({
          error: `Address already registered as ${type}`
        })
      }

      // Create new user
      console.log('Creating new user:', { address, type, email, name })
      
      let user = null
      if (type === 'visitor') {
        user = await fastify.prisma.visitor.create({
          data: {
            address: normalizeAddress(address),
            email,
            name,
            type: 'visitor'
          }
        })
      } else {
        if (!name) {
          return reply.status(400).send({
            error: 'Name is required for venue registration'
          })
        }
        console.log('Creating venue with data:', {
          address: normalizeAddress(address),
          email,
          name,
          type: 'venue'
        });

        user = await fastify.prisma.venue.create({
          data: {
            address: normalizeAddress(address),
            email,
            name,
            type: 'venue'
          }
        })

        console.log('Created venue:', user);
      }

      console.log('User created:', user)

      // Set session cookie
      const sessionData = {
        message,
        signature,
        nonce,
        type
      }
      console.log('Setting session cookie:', sessionData)

      reply.setCookie('siwe', JSON.stringify(sessionData), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        domain: 'localhost',
        maxAge: 60 * 60 * 24 * 7 // 1 week
      })

      return reply.send({
        success: true,
        type,
        address: fields.address
      })
    } catch (error) {
      console.error('Registration error:', {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        message: error instanceof Error ? error.message : 'Unknown error',
        body: request.body
      })
      return reply.status(500).send({ error: 'Registration failed' })
    }
  })
}

export default register