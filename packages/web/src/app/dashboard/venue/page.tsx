'use client'

import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Header } from '@/components/header'
import { useAuth } from '@/hooks/useAuth'
import { VenueChatWindow } from '@/components/venue-chat-window'
import { formatAddress } from '@/lib/utils'

type Campaign = {
  id: string
  rewardContractAddress: string
  rewardToken: string
  objective: string // This is our campaignId
  amount: string
  createdAt: string
}

export default function VenueDashboard() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const { isAuthenticated, loading } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(true)

  useEffect(() => {
    const fetchCampaigns = async () => {
      if (!address) return
      
      try {
        const response = await fetch(`/api/venue/campaigns?address=${address}`);
        if (!response.ok) {
          throw new Error('Failed to fetch campaigns');
        }
        const data = await response.json();
        setCampaigns(data);
      } catch (error) {
        console.error('Error fetching campaigns:', error)
      } finally {
        setLoadingCampaigns(false)
      }
    }

    fetchCampaigns()
  }, [address])

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

          {/* Campaign List */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Your Campaigns</h2>
            {loadingCampaigns ? (
              <div className="text-white text-center py-8">Loading campaigns...</div>
            ) : campaigns.length === 0 ? (
              <div className="text-white/70 text-center py-8">
                No campaigns found. Use the chat below to create one!
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((campaign) => (
                  <div 
                    key={campaign.id} 
                    className="p-4 bg-white/5 rounded-lg border border-white/10"
                  >
                    <div className="text-white">
                      <p className="font-medium">Campaign ID: {campaign.objective}</p>
                      <p className="text-sm opacity-70">
                        Reward Contract: {formatAddress(campaign.rewardContractAddress)}
                      </p>
                      <p className="text-sm opacity-70">
                        Reward Token: {formatAddress(campaign.rewardToken)}
                      </p>
                      <p className="text-sm opacity-70">
                        Amount: {campaign.amount}
                      </p>
                      <p className="text-sm opacity-70">
                        Created: {new Date(campaign.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <VenueChatWindow agentType="campaignManager" />
        </div>
      </main>
    </>
  )
} 