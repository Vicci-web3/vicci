import { app } from './app'
import Fastify from 'fastify'
import { MessageBus } from '@vic/shared'

const server = Fastify({
  logger: true,
  disableRequestLogging: false,
})

// Register our app
server.register(app)

// Add messageBus to fastify instance
declare module 'fastify' {
  interface FastifyInstance {
    messageBus: MessageBus
  }
}

// Start listening
const start = async () => {
  try {
    // Initialize message bus
    const messageBus = new MessageBus()
    await messageBus.connect()
    server.decorate('messageBus', messageBus)

    await server.listen({ port: 3000, host: '0.0.0.0' })
    console.log('Server listening on port 3000')
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start() 