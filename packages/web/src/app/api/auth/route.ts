import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('siwe')

  if (!sessionCookie) {
    return NextResponse.json({ 
      authenticated: false,
      redirect: '/login'
    })
  }

  try {
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
      throw new Error('Session verification failed')
    }

    const data = await response.json()
    return NextResponse.json({
      authenticated: true,
      user: data.user
    })

  } catch (error) {
    console.error('Auth verification error:', error)
    return NextResponse.json({ 
      authenticated: false,
      redirect: '/login',
      error: error instanceof Error ? error.message : 'Authentication failed'
    })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { message, signature } = body

    // Store SIWE session
    const res = NextResponse.json({ success: true })
    res.cookies.set('siwe', JSON.stringify({ message, signature }), {
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      maxAge: 604800 // 7 days
    })
    return res

  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Authentication failed' 
    }, { status: 500 })
  }
} 