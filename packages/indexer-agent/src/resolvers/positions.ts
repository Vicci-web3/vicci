import { Resolvers } from '../../.graphclient'

interface Position {
  id: string
  owner?: string
  account?: {
    id: string
  }
  liquidity: string
}

const resolvers: Resolvers = {
  Query: {
    async mergedPositions(root, args, context, info) {
      const uniswapBaseResult = await context.uniswapV3Base.Query.positions({
        first: 10,
        orderBy: 'liquidity', 
        orderDirection: 'desc',
        where: { liquidity_gt: '0' },
        selectionSet: `{ id owner liquidity }`
      })

      const sushiBaseResult = await context.sushiswapV3Arbitrum.Query.positions({
        first: 10,
        orderBy: 'liquidity',
        orderDirection: 'desc', 
        where: { liquidity_gt: '0' },
        selectionSet: `{ id account { id } liquidity }`
      })
      const uniswapResult = await context.uniswapV3mainnet.Query.positions({
        first: 10,
        orderBy: 'liquidity',
        orderDirection: 'desc',
        where: { liquidity_gt: '0' },
        selectionSet: `{ id owner liquidity }`
      })

      const sushiResult = await context.sushiswapV3Mainnet.Query.positions({
        first: 10,
        orderBy: 'liquidity',
        orderDirection: 'desc',
        where: { liquidity_gt: '0' },
        selectionSet: `{ id account { id } liquidity }`
      })
      
      const mergedPositions = [
        ...(uniswapResult || []).map((pos: Position) => ({
          id: pos.id,
          owner: pos.owner,
          liquidity: pos.liquidity
        })),
        ...(sushiResult || []).map((pos: Position) => ({
          id: pos.id,
          owner: pos.account?.id || '0x0000000000000000000000000000000000000000',
          liquidity: pos.liquidity
        })),
        ...(uniswapBaseResult || []).map((pos: Position) => ({
          id: pos.id,
          owner: pos.owner,
          liquidity: pos.liquidity
        })),
        ...(sushiBaseResult || []).map((pos: Position) => ({
          id: pos.id,
          owner: pos.account?.id || '0x0000000000000000000000000000000000000000',
          liquidity: pos.liquidity
        }))
      ]

      return mergedPositions
    }
  }
}

export default resolvers