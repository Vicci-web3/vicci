'use client'

import { useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { SiweMessage } from 'siwe'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export function LoginForm() {
  const { address, isConnected, chainId } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const router = useRouter()
  const { setIsAuthenticated } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
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
        statement: 'Sign in with Ethereum to access Visitor Information Center',
        uri: window.location.origin,
        version: '1',
        chainId: chainId || 1,
        nonce,
        issuedAt: new Date().toISOString(),
        expirationTime: new Date(Date.now() + 1000 * 60 * 5).toISOString(),
      }).prepareMessage()
      
      const signature = await signMessageAsync({ message })
      if (!signature) {
        throw new Error('No signature received')
      }

      // Create session
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          signature,
          nonce,
          email
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign in')
      }

      setIsAuthenticated(true)

      // Check user type and redirect
      const userResponse = await fetch(`/api/user/status?address=${address}`)
      const userData = await userResponse.json()
      
      if (userData.type) {
        router.push(`/dashboard/${userData.type}`)
      } else {
        router.push('/register')
      }
      
    } catch (err) {
      console.error('Login error:', err)
      setError(err instanceof Error ? err.message : 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white/5 backdrop-blur-sm rounded-lg border border-white/10">
      <h2 className="text-xl font-bold text-white mb-6">Login</h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
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
          {loading ? 'Signing...' : 'Sign in with Ethereum'}
        </button>
      </form>
    </div>
  )
} 