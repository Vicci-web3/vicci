'use client'

import {
  ConnectWallet,
  WalletDefault,
} from '@coinbase/onchainkit/wallet'
import { useAccount } from 'wagmi'

export function ConnectButton() {
  const { isConnected } = useAccount()

  return (
    <ConnectWallet>
      <WalletDefault />
    </ConnectWallet>
  )
}

