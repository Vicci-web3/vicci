import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = cookies()
  const sessionCookie = cookieStore.get('siwe')

  if (!sessionCookie) {
    return NextResponse.json({ 
      authenticated: false,
      redirect: '/register'
    })
  }

  try {
    // Parse the SIWE session
    const session = JSON.parse(sessionCookie.value)
    
    // Verify session with API
    const response = await fetch(`${process.env.API_URL}/api/auth/verify`, {
      headers: {
        Authorization: `Bearer ${session.signature}`,
        'X-SIWE-Message': session.message,
        Cookie: cookieStore.toString()
      },
      credentials: 'include'
    })

    if (!response.ok) {
      // Clear invalid session
      const res = NextResponse.json({ 
        authenticated: false,
        redirect: '/register'
      })
      
      res.headers.set(
        'Set-Cookie',
        'siwe=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
      )
      
      return res
    }

    // Session valid, return user data
    const data = await response.json()
    return NextResponse.json({
      authenticated: true,
      user: {
        address: session.address,
        type: session.type,
        ...data.user
      }
    })
  } catch (error) {
    console.error('Auth verification error:', error)
    return NextResponse.json({ 
      authenticated: false,
      redirect: '/register'
    })
  }
} 