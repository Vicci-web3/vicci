import { FastifyPluginAsync } from 'fastify'
import { SiweMessage } from 'siwe'

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

  // Create session
  fastify.post('/session', async function (request, reply) {
    console.log('Session create received with body:', request.body)
    const { message, signature, nonce } = request.body as { message: string; signature: string; nonce: string }
    
    try {
      console.log('Parsing message:', message)
      const siweMessage = new SiweMessage(message)
      console.log('SIWE Message parsed:', {
        domain: siweMessage.domain,
        address: siweMessage.address,
        nonce: siweMessage.nonce,
        uri: siweMessage.uri
      })
      
      const verifyParams = { 
        signature,
        domain: 'localhost', // Hardcode to match the message domain
        nonce: siweMessage.nonce // Use nonce from the message
      }
      console.log('Verify params:', verifyParams)

      try {
        const { success, data: fields } = await siweMessage.verify(verifyParams)
        console.log('Verification result:', { success, fields })

        if (!success) {
          console.log('Verification failed')
          return reply.status(401).send({ error: 'Invalid signature' })
        }

        // Set session cookie
        const sessionData = JSON.stringify({ message, signature, nonce: siweMessage.nonce })
        console.log('Setting cookie with data:', sessionData)
        
        reply.setCookie('siwe', sessionData, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          domain: 'localhost',
          maxAge: 60 * 60 * 24 * 7 // 1 week
        })

        return reply.send({ 
          authenticated: true, 
          address: fields.address 
        })
      } catch (verifyError) {
        console.error('Verification error:', verifyError)
        return reply.status(401).send({ 
          error: verifyError instanceof Error ? verifyError.message : 'Verification failed'
        })
      }
    } catch (error) {
      console.error('Session creation error:', error)
      return reply.status(401).send({ 
        error: error instanceof Error ? error.message : 'Invalid signature' 
      })
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