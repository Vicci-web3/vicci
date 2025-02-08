import { FastifyPluginAsync } from 'fastify'
import { WebsocketHandler } from '@fastify/websocket'
import VisitorAgent from '../../agent/VisitorAgent'
import VenueAgent from '../../agent/VenueAgent'

interface WsMessage {
  type: 'chat' | 'init';
  agentType?: 'counsellor' | 'campaignManager';
  message?: string;
  visitorId?: string;
}

const ws: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.log.info('Registering WebSocket routes')
  
  fastify.route({
    method: 'GET',
    url: '/agent/venue',
    handler: (req, reply) => {
      // Handle regular HTTP requests if needed
      reply.send({ error: 'WebSocket connection required' })
    },
    wsHandler: (socket, req) => {
      fastify.log.info('New WebSocket connection received')
      let agent: VenueAgent | null = null;

      // Define callbacks for the agent
      const callbacks = {
        sendMessage: (message: string) => {
          socket.send(JSON.stringify({
            type: 'chat',
            success: true,
            message
          }));
        },
        requestPermit: (permitData: any) => {
          socket.send(JSON.stringify({
            type: 'permit',
            data: permitData
          }));
        }
      };

      socket.on('message', async (messageRaw) => {
        try {
          const message = messageRaw.toString()
          fastify.log.info('Raw message received:', message)
          
          const data: WsMessage = JSON.parse(message);
          fastify.log.info('Parsed message:', { type: data.type, message: data.message });
          console.log('data', data)
          switch (data.type) {
            case 'init':
              if (!agent && data.agentType) {
                fastify.log.info(`Initializing ${data.agentType} agent`)
                try {
                  agent = new VenueAgent(callbacks);
                  const response = {
                    type: 'init',
                    success: true,
                    message: `${data.agentType} agent initialized`
                  };
                  fastify.log.info('Sending init response:', response);
                  socket.send(JSON.stringify(response));
                } catch (error) {
                  fastify.log.error('Failed to initialize agent:', error);
                  socket.send(JSON.stringify({
                    type: 'error',
                    message: 'Failed to initialize agent: ' + (error instanceof Error ? error.message : 'Unknown error')
                  }));
                }
              }
              break;

            case 'chat':
              if (!agent) {
                fastify.log.warn('Chat message received but agent not initialized')
                socket.send(JSON.stringify({
                  type: 'error',
                  message: 'Agent not initialized'
                }));
                return;
              }

              if (data.message) {
                try {
                  fastify.log.info('Processing chat message:', data.message);
                  const response = await agent.processUserInput(data.message);
                  const messageResponse = {
                    type: 'chat',
                    success: true,
                    message: response
                  };
                  fastify.log.info('Sending chat response:', messageResponse);
                  socket.send(JSON.stringify(messageResponse));
                } catch (error) {
                  fastify.log.error('Error processing message:', error);
                  socket.send(JSON.stringify({
                    type: 'error',
                    message: 'Error processing message'
                  }));
                }
              }
              break;

            default:
              fastify.log.warn(`Invalid message type received: ${data.type}`)
              socket.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message type'
              }));
          }
        } catch (error) {
          fastify.log.error('Error handling WebSocket message:', error)
          socket.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }));
        }
      });

      socket.on('error', (error) => {
        fastify.log.error('WebSocket error:', error)
      });

      socket.on('close', () => {
        fastify.log.info('WebSocket connection closed, cleaning up agent')
        agent = null;
      });
    }
  })

  fastify.route({
    method: 'GET',
    url: '/agent/visitor',
    handler: (req, reply) => {
      // Handle regular HTTP requests if needed
      reply.send({ error: 'WebSocket connection required' })
    },
    wsHandler: (socket, req) => {
      fastify.log.info('New WebSocket connection received')
      let agent: VisitorAgent | null = null;
      const callbacks = {
        sendMessage: (message: string) => {
          socket.send(JSON.stringify({
            type: 'chat',
            success: true,
            message
          }));
        },
        requestPermit: (permitData: any) => {
          socket.send(JSON.stringify({
            type: 'permit',
            data: permitData
          }));
        }
      };

      socket.on('message', async (messageRaw) => {
        try {
          const message = messageRaw.toString()
          fastify.log.info('Raw message received:', message)
          
          const data: WsMessage = JSON.parse(message);
          console.log('data', data)
          data.agentType = 'counsellor'
          fastify.log.info('Parsed message:', { type: data.type, message: data.message });

          switch (data.type) {
            case 'init':
              if (!agent && data.agentType) {
                fastify.log.info(`Initializing ${data.agentType} agent`)
                try {
                  agent = new VisitorAgent(callbacks, data.visitorId);
                  const response = {
                    type: 'init',
                    success: true,
                    message: `${data.agentType} agent initialized`
                  };
                  fastify.log.info('Sending init response:', response);
                  socket.send(JSON.stringify(response));
                } catch (error) {
                  fastify.log.error('Failed to initialize agent:', error);
                  socket.send(JSON.stringify({
                    type: 'error',
                    message: 'Failed to initialize agent: ' + (error instanceof Error ? error.message : 'Unknown error')
                  }));
                }
              }
              break;

            case 'chat':
              if (!agent) {
                fastify.log.warn('Chat message received but agent not initialized')
                socket.send(JSON.stringify({
                  type: 'error',
                  message: 'Agent not initialized'
                }));
                return;
              }

              if (data.message) {
                try {
                  fastify.log.info('Processing chat message:', data.message);
                  const response = await agent.processUserInput(data.message);
                  const messageResponse = {
                    type: 'chat',
                    success: true,
                    message: response
                  };
                  fastify.log.info('Sending chat response:', messageResponse);
                  socket.send(JSON.stringify(messageResponse));
                } catch (error) {
                  fastify.log.error('Error processing message:', error);
                  socket.send(JSON.stringify({
                    type: 'error',
                    message: 'Error processing message'
                  }));
                }
              }
              break;

            default:
              fastify.log.warn(`Invalid message type received: ${data.type}`)
              socket.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message type'
              }));
          }
        } catch (error) {
          fastify.log.error('Error handling WebSocket message:', error)
          socket.send(JSON.stringify({
            type: 'error',
            message: 'Invalid message format'
          }));
        }
      });

      socket.on('error', (error) => {
        fastify.log.error('WebSocket error:', error)
      });

      socket.on('close', () => {
        fastify.log.info('WebSocket connection closed, cleaning up agent')
        agent = null;
      });
    }
  })
}

export default ws; 