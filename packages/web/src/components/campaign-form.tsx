'use client'

import { useState } from 'react'
import { useAccount } from 'wagmi'

interface CampaignFormData {
  protocol: string
  objective: string
  rewardToken: string
  rewardType: string
  amount: string
  validUntil: string
}

const REWARD_TYPES = ['ERC20', 'NFT', 'SBT'] as const
type RewardType = typeof REWARD_TYPES[number]

interface CampaignFormProps {
  onSuccess?: () => void
}

export function CampaignForm({ onSuccess }: CampaignFormProps) {
  const { address } = useAccount()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<CampaignFormData>({
    protocol: '',
    objective: '',
    rewardToken: '',
    rewardType: 'ERC20',
    amount: '',
    validUntil: ''
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!address) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to create campaign')
      }

      // Reset form
      setFormData({
        protocol: '',
        objective: '',
        rewardToken: '',
        rewardType: 'ERC20',
        amount: '',
        validUntil: ''
      })

      // Call success callback if provided
      onSuccess?.()
    } catch (err) {
      console.error('Campaign creation error:', err)
      setError(err instanceof Error ? err.message : 'Failed to create campaign')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
      <h2 className="text-xl font-bold text-white mb-6">Create Campaign</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Protocol
          </label>
          <input
            type="text"
            name="protocol"
            value={formData.protocol}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Objective
          </label>
          <textarea
            name="objective"
            value={formData.objective}
            onChange={handleInputChange}
            required
            rows={3}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Reward Token
          </label>
          <input
            type="text"
            name="rewardToken"
            value={formData.rewardToken}
            onChange={handleInputChange}
            required
            placeholder="0x..."
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Reward Type
          </label>
          <select
            name="rewardType"
            value={formData.rewardType}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white"
          >
            {REWARD_TYPES.map((type) => (
              <option 
                key={type} 
                value={type}
                className="bg-gray-800"
              >
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Amount
          </label>
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleInputChange}
            required
            min="0"
            step="1"
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/50"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Valid Until
          </label>
          <input
            type="datetime-local"
            name="validUntil"
            value={formData.validUntil}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/50"
          />
        </div>

        {error && (
          <div className="text-red-400 text-sm">{error}</div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'Creating...' : 'Create Campaign'}
        </button>
      </form>
    </div>
  )
} 