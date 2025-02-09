'use client'

import { useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { SiweMessage } from 'siwe'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

type LoginType = 'visitor' | 'venue'

export function LoginForm() {
  const { address, isConnected, chainId } = useAccount()
  const { signMessageAsync } = useSignMessage()
  const router = useRouter()
  const { setIsAuthenticated } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loginType, setLoginType] = useState<LoginType>('visitor')

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!address || !isConnected) {
      setError('Please connect your wallet first')
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Clear any existing state first
      setIsAuthenticated(false)
      localStorage.removeItem('userType')

      // Get nonce
      const nonceResponse = await fetch('/api/register/nonce')
      const nonce = await nonceResponse.text()

      // Create SIWE message
      const message = new SiweMessage({
        domain: process.env.NODE_ENV === 'production' ? 'vicci-web3.info' : 'localhost',
        address,
        statement: `Sign in with Ethereum to access Visitor Information Center as ${loginType}`,
        uri: window.location.origin,
        version: '1',
        chainId: 84532,
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

      // Login
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: preparedMessage,
          signature,
          nonce,
          type: loginType
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign in')
      }

      setIsAuthenticated(true)
      window.location.href = `/dashboard/${loginType}`
      //router.push(`/dashboard/${loginType}`)
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

      <div className="mb-6">
        <label className="block text-sm font-medium text-white mb-2">
          Login as:
        </label>
        <div className="flex gap-4">
          <label
            className={`px-4 py-2 rounded-md cursor-pointer ${
              loginType === 'visitor'
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <input
              type="radio"
              name="loginType"
              value="visitor"
              checked={loginType === 'visitor'}
              onChange={(e) => setLoginType(e.target.value as LoginType)}
              className="sr-only"
            />
            Visitor
          </label>
          <label
            className={`px-4 py-2 rounded-md cursor-pointer ${
              loginType === 'venue'
                ? 'bg-blue-600 text-white'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            <input
              type="radio"
              name="loginType"
              value="venue"
              checked={loginType === 'venue'}
              onChange={(e) => setLoginType(e.target.value as LoginType)}
              className="sr-only"
            />
            Venue
          </label>
        </div>
      </div>

      {!isConnected ? (
        <div className="text-center text-white">
          <p className="mb-4">Please connect your wallet to login</p>
        </div>
      ) : (
        <form onSubmit={handleLogin} className="space-y-4">
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
      )}
    </div>
  )
} 