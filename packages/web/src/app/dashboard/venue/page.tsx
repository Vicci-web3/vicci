'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Header } from '@/components/header'
import { useAuth } from '@/hooks/useAuth'
import { CampaignForm } from '@/components/campaign-form'

export default function VenueDashboard() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const { isAuthenticated, loading } = useAuth()
  const [showCampaignForm, setShowCampaignForm] = useState(false)

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
        <div className="flex flex-col space-y-6">
          <h1 className="text-2xl font-bold text-white mb-6">Venue Dashboard</h1>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
            <div className="text-white">
              <p className="text-sm opacity-70">Contract Address</p>
              <p className="font-mono mb-4">{address}</p>
            </div>
          </div>

          {/* Campaign List will go here */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
            <div className="flex flex-col items-center justify-center min-h-[200px]">
              <button
                onClick={() => setShowCampaignForm(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Add Campaign
              </button>
            </div>
          </div>

          {/* Campaign Form Modal */}
          {showCampaignForm && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="relative w-full max-w-2xl">
                <button
                  onClick={() => setShowCampaignForm(false)}
                  className="absolute top-4 right-4 text-white/70 hover:text-white"
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
                <CampaignForm onSuccess={() => setShowCampaignForm(false)} />
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  )
} 