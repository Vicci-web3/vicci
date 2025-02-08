import { FastifyPluginAsync, FastifyRequest } from 'fastify';

interface QueryParams {
  address?: string;
}

// Helper to convert BigInt to string in objects
function serializeBigInt(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'bigint') {
    return data.toString();
  }

  if (Array.isArray(data)) {
    return data.map(serializeBigInt);
  }

  if (typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, serializeBigInt(value)])
    );
  }

  return data;
}

const permits: FastifyPluginAsync = async (fastify): Promise<void> => {
  fastify.get('/', async (request: FastifyRequest<{ Querystring: QueryParams }>, reply) => {
    const { address } = request.query;
    console.log('Received request for permits with address:', address);

    if (!address) {
      return reply.status(400).send({
        error: 'Address is required to fetch permits'
      });
    }

    try {
      // First get the visitor
      console.log('Looking up visitor with address:', address.toLowerCase());
      
      const visitor = await fastify.prisma.visitor.findUnique({
        where: {
          address: address.toLowerCase()
        }
      });

      console.log('Visitor lookup result:', visitor);

      if (!visitor) {
        console.log('No visitor found for address:', address);
        return reply.status(404).send({
          error: `No visitor found with address ${address}`
        });
      }

      // Get permits for this visitor with campaign details
      console.log('Fetching permits for visitor ID:', visitor.id);
      
      const permits = await fastify.prisma.permit.findMany({
        where: {
          visitorId: visitor.id
        },
        include: {
          campaign: true // Include campaign details
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      console.log('Found permits:', permits);
      
      // Serialize all BigInt values, including nested ones in campaign
      const serializedData = serializeBigInt(permits);
      return reply.send(serializedData);
      
    } catch (error) {
      console.error('Error in /permits:', error);
      return reply.status(500).send({
        error: 'Failed to fetch permits',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
};

export default permits;