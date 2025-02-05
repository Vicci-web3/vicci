import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { message, signature } = body

    // Forward the verification request to the API service
    const apiResponse = await fetch(`${process.env.API_URL}/api/register/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        signature,
      }),
    })

    const responseData = await apiResponse.json()

    if (!apiResponse.ok) {
      return NextResponse.json(
        { error: responseData.error || 'Verification failed' },
        { status: apiResponse.status }
      )
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    )
  }
} 