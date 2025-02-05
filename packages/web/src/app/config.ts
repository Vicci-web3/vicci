'use client'

import { http, createConfig, createStorage, cookieStorage } from 'wagmi'
import { base, baseSepolia } from 'wagmi/chains'
import { coinbaseWallet } from 'wagmi/connectors'

export function getConfig() {
    return createConfig({
        chains: [base, baseSepolia],
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
            [base.id]: http(),
            [baseSepolia.id]: http(),
        },
    })
}

declare module 'wagmi' {
    interface Register {
        config: ReturnType<typeof getConfig>;
    }
}