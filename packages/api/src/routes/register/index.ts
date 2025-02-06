import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { generateNonce, SiweMessage } from 'siwe'

interface RegisterBody {
  type: 'visitor' | 'venue'
  data: {
    name: string
    email?: string
    address: string
    type?: string
  }
  auth: {
    message: string
    signature: string
    nonce: string
  }
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
  fastify.post('/', async function (request, reply) {
    try {
      const { type, data, auth } = request.body

      // Verify SIWE first
      const siweMessage = new SiweMessage(auth.message)
      const verifyParams = { 
        signature: auth.signature,
        domain: 'localhost',
        nonce: auth.nonce
      }

      console.log('Verifying SIWE with params:', verifyParams)
      const { success, data: fields } = await siweMessage.verify(verifyParams)

      if (!success) {
        return reply.status(401).send({ error: 'Invalid signature' })
      }

      // Verify the signing address matches the registration address for visitors
      if (type === 'visitor' && fields.address.toLowerCase() !== data.address.toLowerCase()) {
        return reply.status(401).send({ error: 'Address mismatch' })
      }

      // Create or update based on type
      if (type === 'venue') {
        const { address, name, email, type: venueType } = data
        if (!name || !type) {
          return reply.status(400).send({ error: 'Name and type are required for venue registration' })
        }

        // Create or update venue in database
        const venue = await fastify.prisma.venue.upsert({
          where: {
            address: address,
          },
          update: {
            name,
            email: email || null,
            verified: true,
            type: venueType,
          },
          create: {
            address,
            name,
            email: email || null,
            type: venueType,
            verified: true,
          },
        })

        // Set session cookie after successful registration
        reply.setCookie('siwe', JSON.stringify(auth), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          domain: 'localhost',
          maxAge: 60 * 60 * 24 * 7 // 1 week
        })

        return reply.send({ success: true, venue })
      } else {
        // Visitor registration logic
        const visitor = await fastify.prisma.visitor.upsert({
          where: {
            address: data.address, // Use data.address here
          },
          update: {
            name: data.name || null,
            email: data.email || null,
            verified: true,
          },
          create: {
            address: data.address, // And here
            name: data.name || null,
            email: data.email || null,
            verified: true,
          },
        })

        // Set session cookie after successful registration
        reply.setCookie('siwe', JSON.stringify(auth), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          domain: 'localhost',
          maxAge: 60 * 60 * 24 * 7 // 1 week
        })

        return reply.send({ success: true, visitor })
      }
    } catch (error) {
      console.error('Registration error:', error)
      return reply.status(500).send({ error: 'Registration failed' })
    }
  })
}

export default register