import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'

export function useAuth() {
  const { isConnected } = useAccount()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      if (!isConnected) {
        setIsAuthenticated(false)
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/auth/session')
        const data = await response.json()
        
        if (!data.authenticated) {
          setIsAuthenticated(false)
          localStorage.removeItem('userType')
        } else {
          setIsAuthenticated(true)
        }
      } catch (error) {
        console.error('Auth check error:', error)
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [isConnected])

  return { 
    isAuthenticated, 
    loading,
    setIsAuthenticated
  }
} 