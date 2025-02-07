import { FastifyPluginAsync } from 'fastify'
import { CoinbaseAgent } from '../agent'

interface WsMessage {
  type: 'chat' | 'init' | 'permit_signature';
  agentType?: 'counsellor' | 'campaignManager';
  message?: string;
  signature?: string;
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

        if (data.type === 'init') {
          agent = new CoinbaseAgent(data.agentType!, {
            sendMessage: (message: string) => {
              connection.socket.send(JSON.stringify({
                type: 'chat',
                success: true,
                message
              }));
            },
            requestPermit: (permitData: any) => {
              connection.socket.send(JSON.stringify({
                type: 'permit_request',
                data: {
                  owner: permitData.owner,
                  spender: permitData.spender,
                  value: permitData.value,
                  nonce: permitData.nonce,
                  deadline: permitData.deadline
                }
              }));
            }
          });
          
          connection.socket.send(JSON.stringify({
            type: 'init',
            success: true
          }));
        } 
        else if (data.type === 'chat' && agent) {
          await agent.handleMessage(data.message || '');
        }
        else if (data.type === 'permit_signature' && agent) {
          // Forward the signature to the agent
          await agent.handlePermitSignature(data.signature!);
        }

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