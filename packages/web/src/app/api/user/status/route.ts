import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    console.log('Status check received')
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      )
    }

    // Forward the request to the API service
    const apiResponse = await fetch(`${process.env.API_URL}/api/user/status?address=${address}`)
    const data = await apiResponse.json()

    if (!apiResponse.ok) {
      return NextResponse.json(
        { error: data.error || 'Failed to get user status' },
        { status: apiResponse.status }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    )
  }
} 