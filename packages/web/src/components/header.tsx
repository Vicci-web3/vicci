'use client'

import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { ConnectButton } from '@/components/connect-button'
import Link from 'next/link'

type UserType = 'visitor' | 'venue' | null

export function Header() {
  const { address } = useAccount()
  const router = useRouter()
  const { isAuthenticated, setIsAuthenticated } = useAuth()
  const [userType, setUserType] = useState<UserType>(null)

  useEffect(() => {
    const checkUserType = async () => {
      if (!address || !isAuthenticated) {
        setUserType(null)
        return
      }

      try {
        const response = await fetch(`/api/user/status?address=${address}`)
        const data = await response.json()
        console.log('User type check response:', {
          address,
          data,
          type: data.type
        })
        
        // Ensure we're getting the correct type from the API
        if (data.type === 'visitor' || data.type === 'venue') {
          setUserType(data.type)
        } else {
          console.error('Invalid user type received:', data.type)
          setUserType(null)
        }
      } catch (error) {
        console.error('User type check error:', error)
        setUserType(null)
      }
    }

    checkUserType()
  }, [address, isAuthenticated])

  const handleLogout = async () => {
    try {
      // Clear server session
      await fetch('/api/auth/session', {
        method: 'DELETE'
      })

      // Clear all local state
      setIsAuthenticated(false)
      setUserType(null)

      // Clear any wagmi state if needed
      // This might help ensure wallet state is fresh on next login
      localStorage.removeItem('wagmi.store')
      localStorage.removeItem('wagmi.recentConnectorId')

      // Navigate home
      router.push('/')
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  const handleDashboardClick = () => {
    if (userType) {
      router.push(`/dashboard/${userType}`)
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
            <button
              onClick={handleDashboardClick}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {userType.charAt(0).toUpperCase() + userType.slice(1)} Dashboard
            </button>
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

