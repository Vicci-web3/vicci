import { FastifyPluginAsync } from 'fastify'
import { SiweMessage } from 'siwe'

interface LoginBody {
  message: string
  signature: string
  nonce: string
  type: 'visitor' | 'venue'
}

const auth: FastifyPluginAsync = async (fastify): Promise<void> => {
  // Register cookie plugin

  // Verify session
  fastify.get('/session', async function (request, reply) {
    console.log('Session check received')
    console.log('Cookies:', request.cookies)
    
    try {
      const session = request.cookies.siwe
      if (!session) {
        console.log('No session cookie found')
        return reply.status(401).send({ authenticated: false })
      }

      console.log('Found session cookie:', session)
      const { message, signature, nonce } = JSON.parse(session)
      const siweMessage = new SiweMessage(message)
      
      console.log('Verifying session with:', {
        domain: request.hostname,
        nonce,
        messageAddress: siweMessage.address
      })

      const { success, data: fields } = await siweMessage.verify({ 
        signature,
        domain: 'localhost',
        nonce
      })

      console.log('Verification result:', { success, fields })

      if (!success) {
        console.log('Session verification failed')
        reply.clearCookie('siwe')
        return reply.status(401).send({ authenticated: false })
      }

      return reply.send({ 
        authenticated: true, 
        address: fields.address 
      })
    } catch (error) {
      console.error('Session verification error:', error)
      reply.clearCookie('siwe')
      return reply.status(401).send({ authenticated: false })
    }
  })

  // Login endpoint
  fastify.post('/login', async function (request, reply) {
    const { message, signature, nonce, type } = request.body as LoginBody
    console.log('Login attempt:', { type })

    try {
      // Verify SIWE message
      const siweMessage = new SiweMessage(message)
      console.log('SIWE Message:', {
        address: siweMessage.address,
        nonce: siweMessage.nonce,
        domain: siweMessage.domain
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

      // Verify user exists and type matches
      const address = fields.address.toLowerCase()
      console.log('Checking registration for:', { 
        address, 
        type,
        originalAddress: fields.address 
      })

      let userRecord = null

      if (type === 'visitor') {
        userRecord = await fastify.prisma.visitor.findUnique({
          where: { address }
        })
      } else {
        userRecord = await fastify.prisma.venue.findUnique({
          where: { address }
        })
      }

      if (!userRecord) {
        console.log('No user found:', { 
          type, 
          address,
          searchedTable: type === 'visitor' ? 'Visitor' : 'Venue'
        })
        return reply.status(401).send({ 
          error: `No registered ${type} found for this address` 
        })
      }

      console.log('User found:', { userRecord, type })

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

      const response = { 
        success: true,
        type,
        address: fields.address
      }
      console.log('Sending response:', response)

      return reply.send(response)
    } catch (error) {
      console.error('Login error:', {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        message: error instanceof Error ? error.message : 'Unknown error'
      })
      return reply.status(500).send({ error: 'Login failed' })
    }
  })

  // Clear session
  fastify.delete('/session', async function (request, reply) {
    reply.clearCookie('siwe')
    return { authenticated: false }
  })

  // Base auth route
  fastify.get('/', async function (request, reply) {
    return { message: 'Auth API' }
  })
}

export default auth 