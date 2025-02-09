'use client'

import { useAccount, useWriteContract, usePublicClient } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { Header } from '@/components/header'
import { useAuth } from '@/hooks/useAuth'
import { VisitorChatWindow } from '@/components/visitor-chat-window'
import { formatAddress } from '@/lib/utils'
import VicciRewardERC20ABI from '@/lib/VicciRewardERC20.json'
import MockERC20ABI from '@/lib/MockERC20.json'
import { 
  Transaction, 
  TransactionButton,
  TransactionStatus,
  TransactionStatusAction,
  TransactionStatusLabel,
  TransactionDefault,
} from '@coinbase/onchainkit/transaction'
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction'

type Campaign = {
  id: string
  rewardContractAddress: string
  rewardToken: string
  objective: string
  amount: string
  createdAt: string
  venue: {
    address: string
  }
}

type Permit = {
  id: string
  campaignId: string
  signature: string
  claimed: boolean
  claimedAt: string | null
  createdAt: string
  amount: string
  deadline: string
  nonce: string
  campaign: Campaign
}

export default function VisitorDashboard() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const { isAuthenticated, loading } = useAuth()
  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient()
  const [claimingHash, setClaimingHash] = useState<`0x${string}` | undefined>()
  const [claimingPermitId, setClaimingPermitId] = useState<string>()
  const [isPending, setIsPending] = useState(false)
  const [isError, setIsError] = useState(false)

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(true)
  const [permits, setPermits] = useState<Permit[]>([])
  const [loadingPermits, setLoadingPermits] = useState(true)

  const fetchPermits = useCallback(async () => {
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
    } finally {
      console.log('🏁 [Visitor Dashboard] Finished permit fetch');
      setLoadingPermits(false);
    }
  }, [address, setLoadingPermits, setPermits]);

  const fetchCampaigns = useCallback(async () => {
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
  }, [setCampaigns, setLoadingCampaigns]);

  useEffect(() => {
    if (address) {
      fetchPermits();
    }
    fetchCampaigns();
  }, [address, fetchPermits, fetchCampaigns]);

  useEffect(() => {
    if (!loading && (!isConnected || !isAuthenticated)) {
      //router.push('/register')
    }
  }, [isConnected, isAuthenticated, loading, router])

  // Add pre-claim checks for each permit
  useEffect(() => {
    permits.forEach(permit => {
      if (!permit.claimed) {
        const rewardContract = {
          address: permit.campaign.rewardContractAddress as `0x${string}`,
          abi: VicciRewardERC20ABI.abi as any
        };

        Promise.all([
          publicClient.readContract({
            ...rewardContract,
            functionName: 'agent',
            args: []
          }),
          publicClient.readContract({
            ...rewardContract,
            functionName: 'usedNonces',
            args: [address as `0x${string}`, BigInt(permit.nonce)]
          }),
          publicClient.readContract({
            ...rewardContract,
            functionName: 'rewardToken',
            args: []
          })
        ]).then(async ([agent, usedNonce, rewardToken]) => {
          // Check token balance using MockERC20 ABI
          const balance = await publicClient.readContract({
            address: rewardToken as `0x${string}`,
            abi: MockERC20ABI.abi as any,
            functionName: 'balanceOf',
            args: [permit.campaign.rewardContractAddress]
          });

          console.log('Pre-claim checks for permit:', permit.id, {
            agent,
            usedNonce,
            rewardToken,
            contractBalance: balance?.toString(),
            claimAmount: permit.amount
          });
        }).catch(error => {
          console.error('Error in pre-claim checks for permit:', permit.id, error);
        });
      }
    });
  }, [permits, address, publicClient]);

  const handleOnStatus = useCallback((status: LifecycleStatus) => {
    console.log('Transaction status:', status)
    if (status.statusName === 'success' && claimingPermitId) {
      // Update permit status
      fetch('/api/permits/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          permitId: claimingPermitId,
          claimedAt: new Date().toISOString()
        })
      }).then(() => {
        setClaimingPermitId(undefined)
        fetchPermits()
      }).catch(error => {
        console.error('Failed to update permit status:', error)
      })
    } else if (status.statusName === 'error') {
      console.error('Transaction failed:', status.statusData)
      // Log additional details about the transaction attempt
      const errorData = status.statusData as any; // Cast to any to access error details
      console.log('Transaction details:', {
        chainId: 84532,
        errorMessage: errorData?.message,
        errorData: errorData?.data,
        // Log the transaction data that was sent
        transactionData: errorData?.transaction
      });

      // If it's a contract revert, try to decode the error
      if (errorData?.data) {
        try {
          console.log('Contract error data:', {
            data: errorData.data,
            message: errorData.message,
            // Add the full error object for inspection
            fullError: errorData
          });
        } catch (decodeError) {
          console.error('Failed to decode error:', decodeError);
        }
      }
    }
  }, [claimingPermitId, fetchPermits])

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
                {permits.map((permit) => {
                  console.log('params', {
                    user: address,
                    amount: BigInt(permit.amount),
                    deadline: BigInt(permit.deadline),
                    nonce: BigInt(permit.nonce)
                  },
                    {
                      signature: permit.signature
                    })
                  return (
                    <div 
                      key={permit.id} 
                      className={`p-4 rounded-lg border border-white/10 ${
                        permit.claimed 
                          ? 'bg-green-950/50 border-green-900/50' 
                          : 'bg-white/5'
                      }`}
                    >
                      <div className="text-white">
                        <p className="font-medium">Campaign: {permit.campaign.objective}</p>
                        <p className="text-sm opacity-70">
                          Status: {permit.claimed ? 'Claimed' : 'Unclaimed'}
                        </p>
                        <p className="text-sm opacity-70">
                          Amount: {permit.amount} tokens
                        </p>
                        <p className="text-sm opacity-70">
                          Created: {new Date(permit.createdAt).toLocaleDateString()}
                        </p>
                        {permit.claimedAt && (
                          <p className="text-sm opacity-70">
                            Claimed: {new Date(permit.claimedAt).toLocaleDateString()}
                          </p>
                        )}
                        {!permit.claimed && (
                          <TransactionDefault
                            chainId={84532}
                            calls={[{
                              address: permit.campaign.rewardContractAddress as `0x${string}`,
                              abi: VicciRewardERC20ABI.abi as any,
                              functionName: 'claimReward',
                              args: [{
                                user: address,
                                amount: BigInt(permit.amount),
                                deadline: BigInt(permit.deadline),
                                nonce: BigInt(permit.nonce)
                              }, permit.signature]
                            }]}
                            onStatus={handleOnStatus}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <VisitorChatWindow onClose={fetchPermits} />
      </main>
    </>
  )
} 