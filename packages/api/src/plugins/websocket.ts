import fp from 'fastify-plugin'
import websocket from '@fastify/websocket'

export default fp(async (fastify) => {
  await fastify.register(websocket, {
    options: {
      // WebSocket server options
      clientTracking: true,
      maxPayload: 1048576, // 1MB max payload
    }
  })
}) 