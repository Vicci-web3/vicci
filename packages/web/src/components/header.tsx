'use client'

import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { ConnectButton } from '@/components/connect-button'
import Link from 'next/link'

export function Header() {
  const { address } = useAccount()
  const router = useRouter()
  const { isAuthenticated, setIsAuthenticated } = useAuth()
  const [userType, setUserType] = useState<string | null>(null)

  useEffect(() => {
    const checkRegistration = async () => {
      if (!address) return

      try {
        const response = await fetch(`/api/user/status?address=${address}`)
        const data = await response.json()
        console.log('Registration check response:', data)
        setUserType(data.type)
      } catch (error) {
        console.error('Registration check error:', error)
      }
    }

    checkRegistration()
  }, [address])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/session', {
        method: 'DELETE'
      })
      setIsAuthenticated(false)
      router.push('/register')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <header className="border-b border-white/10 bg-gray-900/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-8">
          <Link 
            href="/"
            className="text-xl font-bold text-white hover:text-white/80 transition-colors cursor-pointer"
          >
            Visitor Information Center
          </Link>
          {isAuthenticated && userType && (
            <nav className="hidden md:flex space-x-4">
              <button
                onClick={() => router.push(`/dashboard/${userType}`)}
                className="text-white/70 hover:text-white"
              >
                Dashboard
              </button>
            </nav>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <ConnectButton />
          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Logout
            </button>
          ) : (
            <div className="flex space-x-2">
              <Link
                href="/login"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Login
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

