import fp from 'fastify-plugin'
import fastifyPrisma from '@joggr/fastify-prisma'
import { PrismaClient } from '@prisma/client'

export default fp(async (fastify) => {
  await fastify.register(fastifyPrisma, {
    client: new PrismaClient({
      log: ['query', 'info', 'warn', 'error'],
    }),
  })
}) 