import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = cookies()
    const sessionCookie = cookieStore.get('siwe') // Changed from 'session' to 'siwe' based on logs
    
    console.log('Checking existing session:', sessionCookie?.value)
    
    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false, redirect: '/register' })
    }

    // Parse the SIWE session
    const session = JSON.parse(sessionCookie.value)
    
    const response = await fetch(`${process.env.API_URL}/api/auth/session`, {
      headers: {
        Cookie: cookieStore.toString(),
        Authorization: `Bearer ${session.signature}`,
        'X-SIWE-Message': session.message
      },
      credentials: 'include'
    })
    
    if (!response.ok) {
      console.error('API session check failed:', response.status)
      return NextResponse.json({ 
        authenticated: false, 
        redirect: '/register'
      }, { status: response.status })
    }

    const data = await response.json()
    
    // If verification successful, return with no redirect
    if (data.success) {
      return NextResponse.json({ 
        authenticated: true,
        user: {
          address: session.address,
          type: session.type
        }
      })
    }

    // Session invalid, clear cookie and redirect
    const res = NextResponse.json({ 
      authenticated: false, 
      redirect: '/register' 
    })
    
    res.headers.set(
      'Set-Cookie',
      'siwe=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
    )
    
    return res
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json({ 
      authenticated: false,
      redirect: '/register'
    }, { status: 401 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const response = await fetch(`${process.env.API_URL}/api/auth/session`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      credentials: 'include'
    })
    
    const data = await response.json()
    if (!response.ok) throw new Error(data.error)

    // Create response with session data
    const res = NextResponse.json(data)

    // Get the session cookie from API response
    const sessionCookie = response.headers.get('set-cookie')
    if (sessionCookie) {
      // Set cookie with proper attributes for persistence
      res.headers.set('Set-Cookie', sessionCookie.replace(
        'session=',
        'session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=604800;' // 7 days
      ))
    }

    return res
  } catch (error) {
    console.error('Session creation error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    )
  }
}

export async function DELETE() {
  try {
    const response = await fetch(`${process.env.API_URL}/api/auth/session`, {
      method: 'DELETE',
      credentials: 'include'
    })
    
    const data = await response.json()
    
    // Clear the session cookie
    const res = NextResponse.json(data)
    res.headers.set(
      'Set-Cookie',
      'session=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
    )
    
    return res
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 })
  }
} 