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
        console.log('Checking auth session...')
        const response = await fetch('/api/auth/session')
        const data = await response.json()
        console.log('Auth session response:', data)
        
        if (data.authenticated) {
          setIsAuthenticated(true)
          
          // Only check and redirect if on the main page
          if (window.location.pathname === '/') {
            const userResponse = await fetch(`/api/user/status?address=${data.address}`)
            const userData = await userResponse.json()
            console.log('User status:', userData)
            
            if (userData.type) {
              router.push(`/dashboard/${userData.type}`)
            } else {
              router.push('/register')
            }
          }
        } else {
          setIsAuthenticated(false)
          // Only redirect to register if on a protected route (dashboard)
          if (window.location.pathname.includes('/dashboard')) {
            router.push('/register')
          }
        }
      } catch (error) {
        console.error('Auth check error:', error)
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [isConnected, router])

  return { 
    isAuthenticated, 
    loading,
    setIsAuthenticated
  }
} 