import { FastifyPluginAsync } from 'fastify'
import { CoinbaseAgent } from '../agent'

interface WsMessage {
  type: 'chat' | 'init';
  agentType?: 'counsellor' | 'campaignManager';
  message?: string;
}

const agentWebSocket: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.log.info('Registering WebSocket route: /ws/agent')

  fastify.get('/agent', { websocket: true }, (connection) => {
    fastify.log.info('New WebSocket connection received')
    let agent: CoinbaseAgent | null = null;

    connection.socket.on('message', async (messageRaw) => {
      try {
        const message = messageRaw.toString()
        fastify.log.info('Raw message received:', message)
        
        const data: WsMessage = JSON.parse(message);
        fastify.log.info('Parsed message:', { type: data.type, message: data.message });

        // ... rest of the handler code stays the same ...
      } catch (error) {
        fastify.log.error('Error handling WebSocket message:', error)
        connection.socket.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    connection.socket.on('error', (error) => {
      fastify.log.error('WebSocket error:', error)
    });

    connection.socket.on('close', () => {
      fastify.log.info('WebSocket connection closed, cleaning up agent')
      agent = null;
    });
  });
}

export default agentWebSocket 