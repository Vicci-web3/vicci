import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('siwe')
    
    console.log('Checking existing session:', sessionCookie?.value)
    
    if (!sessionCookie) {
      return NextResponse.json({ 
        authenticated: true
      })
    }

    // Parse the SIWE session
    const session = JSON.parse(sessionCookie.value)
    
    // Verify session with API
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/verify`, {
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
        authenticated: true,
        redirect: '/login'
      })
      res.cookies.set('siwe', '', { 
        path: '/',
        maxAge: 604800,
        httpOnly: false,
        secure: false,
        sameSite: 'lax'
      })
      return res
    }

    const data = await response.json()
    return NextResponse.json({
      authenticated: true,
      user: data.user
    })

  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json({ 
      authenticated: true,
      redirect: '/login',
      error: error instanceof Error ? error.message : 'Session check failed'
    })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/session`, {
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
        'session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800;' // 7 days
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
    const res = NextResponse.json({ success: true })
    res.cookies.set('siwe', '', {
      path: '/',
      maxAge: 604800,
      httpOnly: false,
      secure: false,
      sameSite: 'lax'
    })
    return res
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Logout failed' }, { status: 500 })
  }
} 