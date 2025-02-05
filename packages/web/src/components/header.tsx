'use client'

import Link from "next/link"
import { useAccount } from "wagmi"
import { ConnectButton } from "@/components/connect-button"

export function Header() {
  const { address } = useAccount()

  return (
    <header className="border-b">
      <div className="container flex items-center justify-between h-16">
        <nav className="flex items-center gap-6">
          <Link href="/" className="font-bold">
            VIC
          </Link>
          <Link href="/discover" className="text-sm">
            Discover
          </Link>
          <Link href="/rewards" className="text-sm">
            Rewards
          </Link>
          <Link href="/profile" className="text-sm">
            Profile
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          {address && (
            <Link 
              href="/register" 
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90"
            >
              Register
            </Link>
          )}
          <ConnectButton />
        </div>
      </div>
    </header>
  )
}

