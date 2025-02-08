import { FastifyPluginAsync, FastifyRequest } from 'fastify';

interface QueryParams {
  address?: string;
}

// Helper to convert BigInt to string in objects
function serializeBigInt(data: any): any {
  return JSON.parse(JSON.stringify(data, (_, value) =>
    typeof value === 'bigint' ? value.toString() : value
  ));
}

const venue: FastifyPluginAsync = async (fastify): Promise<void> => {
  // Get all campaigns or filter by venue address
  fastify.get('/campaigns', async (request: FastifyRequest<{ Querystring: QueryParams }>, reply) => {
    const { address } = request.query;
    console.log('Received request for campaigns with address:', address);

    try {
      // If address provided, first get the venue
      if (address) {
        console.log('Looking up venue with address:', address.toLowerCase());
        
        const venue = await fastify.prisma.venue.findUnique({
          where: {
            address: address.toLowerCase()
          }
        });

        console.log('Venue lookup result:', venue);

        if (!venue) {
          console.log('No venue found for address:', address);
          return reply.status(404).send({
            error: `No venue found with address ${address}`
          });
        }

        // Get campaigns for this venue
        console.log('Fetching campaigns for venue ID:', venue.id);
        
        const campaigns = await fastify.prisma.campaign.findMany({
          where: {
            venueId: venue.id
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        console.log('Found campaigns:', campaigns);
        // Serialize BigInt values before sending
        return reply.send(serializeBigInt(campaigns));
      }

      // If no address, return all campaigns
      console.log('No address provided, fetching all campaigns');
      
      const campaigns = await fastify.prisma.campaign.findMany({
        orderBy: {
          createdAt: 'desc'
        }
      });

      console.log('Found all campaigns:', campaigns);
      // Serialize BigInt values before sending
      return reply.send(serializeBigInt(campaigns));
    } catch (error) {
      console.error('Error in /venue/campaigns:', error);
      return reply.status(500).send({
        error: 'Failed to fetch campaigns',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
};

export default venue; 