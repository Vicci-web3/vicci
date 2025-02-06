'use client'

import { useState, useEffect } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { SiweMessage } from 'siwe'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useRouter } from 'next/navigation'
import { useAuth } from '../hooks/useAuth'

const registrationSchema = z.object({
  type: z.enum(['visitor', 'venue']),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
})

type RegistrationData = z.infer<typeof registrationSchema>

type RegisterType = 'venue' | 'visitor'

interface VenueFormData {
  name: string
  address: string
  type: string
  email?: string
}

interface VisitorFormData {
  address: string
  name?: string
  email?: string
  type?: string
}

const VENUE_TYPES = ['AMMS', 'Lending', 'Memecoins', 'NFT'] as const
type VenueType = typeof VENUE_TYPES[number]

export function RegistrationForm() {
  const { address, isConnected, chainId } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const router = useRouter()
  const { isAuthenticated: authIsAuthenticated, loading: authLoading, setIsAuthenticated } = useAuth()
  const [loading, setLoading] = useState(false)
  const [registerType, setRegisterType] = useState<RegisterType>('visitor')
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    type: '',
  })

  // Update form when wallet address changes
  useEffect(() => {
    if (registerType === 'visitor' && address) {
      setFormData(prev => ({
        ...prev,
        address: address
      }))
    }
  }, [address, registerType])

  // Reset form data when switching registration type
  const handleTypeChange = (type: RegisterType) => {
    setRegisterType(type)
    setFormData({
      name: '',
      email: '',
      address: type === 'visitor' ? (address || '') : '',
      type: '',
    })
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleRegisterWithEthereum = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!address || !isConnected) {
      setError('Please connect your wallet first')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Get nonce
      const nonceResponse = await fetch('/api/register/nonce')
      const nonce = await nonceResponse.text()

      // Create SIWE message
      const message = new SiweMessage({
        domain: 'localhost',
        address,
        statement: `Register with Ethereum to access Visitor Information Center as ${registerType}`,
        uri: window.location.origin,
        version: '1',
        chainId: chainId || 1,
        nonce,
        issuedAt: new Date().toISOString(),
        expirationTime: new Date(Date.now() + 1000 * 60 * 5).toISOString(),
      })

      const preparedMessage = message.prepareMessage()
      console.log('Prepared SIWE message:', preparedMessage)

      // Sign message
      const signature = await signMessageAsync({ message: preparedMessage })
      if (!signature) {
        throw new Error('No signature received')
      }

      console.log('Registration payload:', {
        message: preparedMessage,
        signature,
        nonce,
        email: formData.email,
        name: formData.name,
        type: registerType
      })

      // Register
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: preparedMessage,
          signature,
          nonce,
          email: formData.email,
          name: formData.name,
          type: registerType
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed')
      }

      setIsAuthenticated(true)
      router.push(`/dashboard/${registerType}`)
    } catch (err) {
      console.error('Registration error:', err)
      setError(err instanceof Error ? err.message : 'Failed to register')
    } finally {
      setLoading(false)
    }
  }

  // Render loading state at the end
  if (authLoading) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
        <div className="text-center text-white">
          <p className="mb-4">Loading...</p>
        </div>
      </div>
    )
  }

  // Main render
  return (
    <div className="max-w-md mx-auto p-6 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
      {!isConnected ? (
        <div className="text-center text-white">
          <p className="mb-4">Please connect your wallet to register</p>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <label className="block text-sm font-medium text-white mb-2">
              Register as:
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => handleTypeChange('visitor')}
                className={`px-4 py-2 rounded-md ${
                  registerType === 'visitor'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Visitor
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('venue')}
                className={`px-4 py-2 rounded-md ${
                  registerType === 'venue'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                Venue
              </button>
            </div>
          </div>

          <form onSubmit={handleRegisterWithEthereum} className="space-y-4">
            {registerType === 'venue' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Venue Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Contract Address *
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    placeholder="0x..."
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Venue Type *
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white"
                  >
                    <option value="" className="bg-gray-800">Select a type...</option>
                    {VENUE_TYPES.map((type) => (
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
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Wallet Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    readOnly
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-md text-white/70"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/50"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-white mb-1">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-md text-white placeholder-white/50"
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading || !isConnected}
              className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                (loading || !isConnected) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Waiting for signature...' : 'Register with Ethereum'}
            </button>
          </form>
        </>
      )}
    </div>
  )
} 