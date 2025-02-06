import { FastifyPluginAsync } from 'fastify'
import { CoinbaseAgent } from '../../agent'

interface WsMessage {
  type: 'chat' | 'init';
  agentType?: 'counsellor' | 'campaignManager';
  message?: string;
}

const agentWebSocket: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get('/ws/agent', { websocket: true }, (connection, req) => {
    let agent: CoinbaseAgent | null = null;

    connection.socket.on('message', async (message: string) => {
      try {
        const data: WsMessage = JSON.parse(message);

        switch (data.type) {
          case 'init':
            if (!agent && data.agentType) {
              agent = new CoinbaseAgent(data.agentType);
              connection.socket.send(JSON.stringify({
                type: 'init',
                success: true,
                message: `${data.agentType} agent initialized`
              }));
            }
            break;

          case 'chat':
            if (!agent) {
              connection.socket.send(JSON.stringify({
                type: 'error',
                message: 'Agent not initialized'
              }));
              return;
            }

            if (data.message) {
              try {
                const response = await agent.processUserInput(data.message);
                connection.socket.send(JSON.stringify({
                  type: 'chat',
                  success: true,
                  message: response
                }));
              } catch (error) {
                connection.socket.send(JSON.stringify({
                  type: 'error',
                  message: 'Error processing message'
                }));
              }
            }
            break;

          default:
            connection.socket.send(JSON.stringify({
              type: 'error',
              message: 'Invalid message type'
            }));
        }
      } catch (error) {
        connection.socket.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    // Clean up on connection close
    connection.socket.on('close', () => {
      agent = null;
    });
  });
}

export default agentWebSocket; 