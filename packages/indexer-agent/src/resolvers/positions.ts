if (process.env.NODE_ENV === 'production') {  
  import { Resolvers } from '../.graphclient'
} else {
  import { Resolvers } from '../../.graphclient'
}

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
    async mergedPositions(root: any, args: any, context: any, info: any) {
      const first = context?.first || 10
      const skip = context?.skip || 0

      console.log(`Fetching ${first + skip} positions from each source`)

      const [uniswapBaseResult, sushiBaseResult, uniswapResult, sushiResult] = await Promise.all([
        context.uniswapV3Base.Query.positions({
          root,
          args: {
            first: first + skip,
            orderBy: 'liquidity',
            orderDirection: 'desc',
            where: { liquidity_gt: '0' }
          },
          context,
          info
        }),
        context.sushiswapV3Arbitrum.Query.positions({
          root,
          args: {
            first: first + skip,
            orderBy: 'liquidity',
            orderDirection: 'desc',
            where: { liquidity_gt: '0' }
          },
          context,
          info
        }),
        context.uniswapV3mainnet.Query.positions({
          root,
          args: {
            first: first + skip,
            orderBy: 'liquidity',
            orderDirection: 'desc',
            where: { liquidity_gt: '0' }
          },
          context,
          info
        }),
        context.sushiswapV3Mainnet.Query.positions({
          root,
          args: {
            first: first + skip,
            orderBy: 'liquidity',
            orderDirection: 'desc',
            where: { liquidity_gt: '0' }
          },
          context,
          info
        })
      ])

      // Merge and normalize positions
      const allPositions = [
        ...(uniswapBaseResult || []).map((pos: Position) => ({
          id: pos.id,
          owner: pos.owner || pos.account?.id,
          liquidity: pos.liquidity,
          source: 'uniswap_base'
        })),
        ...(sushiBaseResult || []).map((pos: Position) => ({
          id: pos.id,
          owner: pos.account?.id || pos.owner,
          liquidity: pos.liquidity,
          source: 'sushi_base'
        })),
        ...(uniswapResult || []).map((pos: Position) => ({
          id: pos.id,
          owner: pos.owner || pos.account?.id,
          liquidity: pos.liquidity,
          source: 'uniswap_mainnet'
        })),
        ...(sushiResult || []).map((pos: Position) => ({
          id: pos.id,
          owner: pos.account?.id || pos.owner,
          liquidity: pos.liquidity,
          source: 'sushi_mainnet'
        }))
      ]

      // Sort by liquidity using string comparison for BigInt values
      const sortedPositions = allPositions.sort((a, b) => {
        // Handle null/undefined values
        if (!a.liquidity) return 1
        if (!b.liquidity) return -1

        // Pad both numbers to same length for string comparison
        const aLiq = a.liquidity.padStart(40, '0')
        const bLiq = b.liquidity.padStart(40, '0')
        
        // Compare as strings (works for very large numbers)
        return bLiq.localeCompare(aLiq)
      })

      console.log(`Total positions before pagination: ${sortedPositions.length}`)
      const paginatedPositions = sortedPositions.slice(skip, skip + first)
      console.log(`Returning ${paginatedPositions.length} positions (skip: ${skip}, first: ${first})`)

      return paginatedPositions
    }
  }
}

export default resolvers