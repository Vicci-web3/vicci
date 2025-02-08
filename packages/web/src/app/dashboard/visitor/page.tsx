'use client'

import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Header } from '@/components/header'
import { useAuth } from '@/hooks/useAuth'
import { VisitorChatWindow } from '@/components/visitor-chat-window'
import { formatAddress } from '@/lib/utils'

type Campaign = {
  id: string
  rewardContractAddress: string
  rewardToken: string
  objective: string
  amount: string
  createdAt: string
}

type Permit = {
  id: string
  campaignId: string
  signature: string
  claimed: boolean
  claimedAt: string | null
  createdAt: string
  campaign: Campaign
}

export default function VisitorDashboard() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const { isAuthenticated, loading } = useAuth()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(true)
  const [permits, setPermits] = useState<Permit[]>([])
  const [loadingPermits, setLoadingPermits] = useState(true)

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        const response = await fetch('/api/venue/campaigns')
        if (!response.ok) {
          throw new Error('Failed to fetch campaigns')
        }
        const data = await response.json()
        setCampaigns(data.slice(0, 10)) // Get only the 10 most recent campaigns
      } catch (error) {
        console.error('Error fetching campaigns:', error)
      } finally {
        setLoadingCampaigns(false)
      }
    }

    const fetchPermits = async () => {
      if (!address) {
        console.log('👤 [Visitor Dashboard] No address available, skipping permit fetch');
        return;
      }
      
      console.log('🔄 [Visitor Dashboard] Starting permit fetch for address:', address);
      setLoadingPermits(true);
      
      try {
        console.log('🌐 [Visitor Dashboard] Making request to /api/permits');
        const response = await fetch(`/api/permits?address=${address}`);
        console.log('📊 [Visitor Dashboard] Response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ [Visitor Dashboard] Error response:', errorData);
          throw new Error(errorData.error || 'Failed to fetch permits');
        }
        
        const data = await response.json();
        console.log('✅ [Visitor Dashboard] Received permits:', data);
        setPermits(data);
      } catch (error) {
        console.error('💥 [Visitor Dashboard] Error fetching permits:', error);
        // Optionally show error to user via toast/alert
      } finally {
        console.log('🏁 [Visitor Dashboard] Finished permit fetch');
        setLoadingPermits(false);
      }
    }

    if (address) {
      fetchPermits();
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
        <h1 className="text-2xl font-bold text-white mb-6">Visitor Dashboard</h1>
        
        {/* Address Card */}
        <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
          <div className="text-white">
            <p className="text-sm opacity-70">Connected Address</p>
            <p className="font-mono mb-4">{address}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Recent Campaigns */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Recent Campaigns</h2>
            {loadingCampaigns ? (
              <div className="text-white text-center py-8">Loading campaigns...</div>
            ) : campaigns.length === 0 ? (
              <div className="text-white/70 text-center py-8">
                No campaigns available.
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.slice(0, 5).map((campaign) => (
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
                        Amount: {campaign.amount}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Your Permits */}
          <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Your Permits</h2>
            {loadingPermits ? (
              <div className="text-white text-center py-8">Loading permits...</div>
            ) : permits.length === 0 ? (
              <div className="text-white/70 text-center py-8">
                No permits found.
              </div>
            ) : (
              <div className="space-y-4">
                {permits.map((permit) => (
                  <div 
                    key={permit.id} 
                    className="p-4 bg-white/5 rounded-lg border border-white/10"
                  >
                    <div className="text-white">
                      <p className="font-medium">Campaign: {permit.campaign.objective}</p>
                      <p className="text-sm opacity-70">
                        Status: {permit.claimed ? 'Claimed' : 'Unclaimed'}
                      </p>
                      <p className="text-sm opacity-70">
                        Created: {new Date(permit.createdAt).toLocaleDateString()}
                      </p>
                      {permit.claimedAt && (
                        <p className="text-sm opacity-70">
                          Claimed: {new Date(permit.claimedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <VisitorChatWindow agentType="counsellor" />
      </main>
    </>
  )
} 