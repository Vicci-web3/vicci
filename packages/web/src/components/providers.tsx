'use client'

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider } from "wagmi"
import { OnchainKitProvider } from "@coinbase/onchainkit"
import { ThemeProvider } from "next-themes"
import { baseSepolia } from "wagmi/chains"
import { getConfig } from "../app/config"

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      suppressHydrationWarning
    >
      <WagmiProvider config={getConfig()}>
        <QueryClientProvider client={queryClient}>
          <OnchainKitProvider
            apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
            chain={baseSepolia}
            config={{
              appearance: {
                mode: 'auto',
                theme: 'hacker'
              }
            }}
          >
            {children}
          </OnchainKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  )
} 