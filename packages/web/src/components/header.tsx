'use client'

import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { ConnectButton } from '@/components/connect-button'
import Link from 'next/link'

type UserRoles = {
  venue?: boolean
  visitor?: boolean
}

export function Header() {
  const { address } = useAccount()
  const router = useRouter()
  const { isAuthenticated, setIsAuthenticated } = useAuth()
  const [userRoles, setUserRoles] = useState<UserRoles>({})

  useEffect(() => {
    const checkUserRoles = async () => {
      if (!address || !isAuthenticated) {
        setUserRoles({})
        return
      }

      try {
        const response = await fetch(`/api/user/status?address=${address}`)
        const data = await response.json()
        console.log('User roles check response:', {
          address,
          data,
          roles: data.roles
        })
        
        // Convert array of roles to object for easier access
        const roles = {
          venue: data.roles.includes('venue'),
          visitor: data.roles.includes('visitor')
        }
        setUserRoles(roles)
      } catch (error) {
        console.error('User roles check error:', error)
        setUserRoles({})
      }
    }

    checkUserRoles()
  }, [address, isAuthenticated])

  const handleLogout = async () => {
    try {
      // Clear server session
      await fetch('/api/auth/session', {
        method: 'DELETE'
      })

      // Clear all local state
      setIsAuthenticated(false)
      setUserRoles({})

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
          {isAuthenticated && (
            <div className="flex space-x-4">
              {userRoles.venue && (
                <Link
                  href="/dashboard/venue"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Venue Dashboard
                </Link>
              )}
              {userRoles.visitor && (
                <Link
                  href="/dashboard/visitor"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Visitor Dashboard
                </Link>
              )}
            </div>
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

