import { ViemWalletProvider } from "@coinbase/agentkit"
import { privateKeyToAccount } from "viem/accounts"
import { baseSepolia } from "viem/chains"
import { createWalletClient, http } from "viem"

export function createWalletProvider() {
  const privateKey = process.env.AGENT_PRIVATE_KEY
  if (!privateKey) {
    throw new Error('AGENT_PRIVATE_KEY environment variable is required')
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`)
  const transport = http(`https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`);

  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport,
  })

  return new ViemWalletProvider(client)
} 