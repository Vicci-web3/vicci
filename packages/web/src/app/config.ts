'use client'

import { http, createConfig, createStorage, cookieStorage } from 'wagmi'
import { baseSepolia } from 'wagmi/chains'
import { coinbaseWallet } from 'wagmi/connectors'

export function getConfig() {
    return createConfig({
        chains: [baseSepolia],
        connectors: [
            coinbaseWallet({
                appName: 'Vic',
                preference: 'all',
                version: '4'
            })
        ],
        storage: createStorage({
            storage: cookieStorage
        }),
        //ssr: true,
        transports: {
            [baseSepolia.id]: http(`https://base-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`),
        },
    })
}

declare module 'wagmi' {
    interface Register {
        config: ReturnType<typeof getConfig>;
    }
}