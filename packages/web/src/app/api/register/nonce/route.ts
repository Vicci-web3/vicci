import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/register/nonce`, {
      method: 'GET',
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to get nonce' },
        { status: response.status }
      )
    }

    const nonce = await response.text()
    return new NextResponse(nonce, {
      headers: {
        'Content-Type': 'text/plain',
      },
    })
  } catch (error) {
    console.error('Nonce error:', error)
    return NextResponse.json(
      { error: 'Failed to get nonce' },
      { status: 500 }
    )
  }
} 