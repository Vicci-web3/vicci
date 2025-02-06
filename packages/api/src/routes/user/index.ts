import { FastifyPluginAsync } from 'fastify'

const user: FastifyPluginAsync = async (fastify): Promise<void> => {
  // Register child routes
  await fastify.register(import('./status'), { prefix: '/status' })
  
  // Add any other user-related routes here
  fastify.get('/', async function (request, reply) {
    return { message: 'User API' }
  })
}

export default user 