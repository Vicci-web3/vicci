import { useAccount } from "wagmi"
import {
  ConnectWallet,
  ConnectWalletText,
  Wallet,
  WalletDropdown,
  WalletDropdownBasename, 
  WalletDropdownFundLink, 
  WalletDropdownLink, 
  WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet';
import {
  Address,
  Avatar,
  Name,
  Identity,
  EthBalance, 
} from '@coinbase/onchainkit/identity';
import { WalletDefault } from '@coinbase/onchainkit/wallet';
 
<WalletDefault /> 
import { color } from '@coinbase/onchainkit/theme';
export function ConnectButton() {
  //const { isConnected } = useAccount()

  return (
    <WalletDefault /> 
  )
}

