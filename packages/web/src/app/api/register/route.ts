import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await fetch(`${process.env.API_URL}/api/register/nonce`)
    const nonce = await response.text()
    return new Response(nonce, {
      headers: { 'Content-Type': 'text/plain' },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate nonce' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Forward request to API
    const response = await fetch(`${process.env.API_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    })

    const data = await response.json()
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    // Forward any cookies set by the API
    const headers = new Headers()
    if (response.headers.get('set-cookie')) {
      headers.set('Set-Cookie', response.headers.get('set-cookie')!)
    }

    return NextResponse.json(data, { headers })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}