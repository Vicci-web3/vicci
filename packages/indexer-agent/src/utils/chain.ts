// TODO: Implement with your preferred web3 library
import { 
  createPublicClient,
  createWalletClient,
  http,
  webSocket,
  getContract
} from 'viem'

import { privateKeyToAccount } from 'viem/accounts'

import {
  mainnet,
  base,
} from 'viem/chains'

const chains = [
  {
    chain: mainnet,
    url: `wss://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  }, {
    chain: base,
    url: `wss://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
  }
]

type ClientMap = { [chainId: number]: ReturnType<typeof createPublicClient> }
type WalletMap = { [chainId: number]: ReturnType<typeof createWalletClient> }

/*
{
chain.id: publicClient(...)}
}
*/
export const publicClients = chains.reduce<ClientMap>((acc, {chain, url}) => {
  acc[chain.id] = createPublicClient({
    chain,
    transport: webSocket(url),
  })
  return acc
}, {})

/*
{
chain.id: walletClient(...)}
}
*/
export const walletClients = chains.reduce<WalletMap>((acc, {chain, url}) => {
  acc[chain.id] = createWalletClient({
    account: privateKeyToAccount(process.env.VIC_PRIVATE_KEY as `0x${string}`),
    chain,
    transport: webSocket(url),
  })
  return acc
}, {})

export async function getCurrentBlock(chainId: number): Promise<number> {
  const publicClient = publicClients[chainId]
  const block = await publicClient.getBlockNumber()
  return Number(block)
} 