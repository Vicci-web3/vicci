'use client'

import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Header } from '@/components/header'
import { useAuth } from '@/hooks/useAuth'

export default function VisitorDashboard() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const { isAuthenticated, loading } = useAuth()

  useEffect(() => {
    if (!loading && (!isConnected || !isAuthenticated)) {
      router.push('/register')
    }
  }, [isConnected, isAuthenticated, loading, router])

  if (loading) {
    return (
      <>
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center text-white">Loading...</div>
        </main>
      </>
    )
  }

  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">Visitor Dashboard</h1>
        <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
          <div className="text-white">
            <p className="text-sm opacity-70">Connected Address</p>
            <p className="font-mono mb-4">{address}</p>
            {/* Add visitor-specific content here */}
          </div>
        </div>
      </main>
    </>
  )
} 