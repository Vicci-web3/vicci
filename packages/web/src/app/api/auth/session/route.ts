import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    console.log('Forwarding session check to API')
    console.log('Cookies:', cookies().toString())
    
    const response = await fetch(`${process.env.API_URL}/api/auth/session`, {
      headers: {
        Cookie: cookies().toString()
      },
      credentials: 'include'
    })
    
    const data = await response.json()
    console.log('API response:', data)
    
    // Forward the response headers (including Set-Cookie)
    const headers = new Headers(response.headers)
    return NextResponse.json(data, { headers })
  } catch (error) {
    console.error('Session check error:', error)
    return NextResponse.json({ authenticated: false }, { status: 401 })
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

    // Forward the Set-Cookie header
    const headers = new Headers(response.headers)
    if (response.headers.get('set-cookie')) {
      headers.set('Set-Cookie', response.headers.get('set-cookie')!)
    }

    return NextResponse.json(data, { 
      headers,
      status: response.status 
    })
  } catch (error) {
    console.error('Session creation error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    )
  }
}

export async function DELETE() {
  const response = await fetch(`${process.env.API_URL}/api/auth/session`, {
    method: 'DELETE'
  })
  
  const data = await response.json()
  const headers = new Headers(response.headers)
  return NextResponse.json(data, { headers })
} 