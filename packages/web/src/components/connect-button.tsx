'use client'

import {
  WalletDefault,
} from '@coinbase/onchainkit/wallet'
import { useAccount } from 'wagmi'

export function ConnectButton() {
  const { isConnected } = useAccount()

  return (
      <WalletDefault />
  )
}

