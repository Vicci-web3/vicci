import { NextResponse } from 'next/server'
import { SiweMessage } from 'siwe'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { message, signature, type, name, email, address } = body

    // Verify SIWE message
    const siweMessage = new SiweMessage(message)
    const fields = await siweMessage.verify({ signature })

    if (!fields.success) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    // TODO: Store user data in your database
    // This is where you'd save the user's registration info
    const user = {
      address,
      type,
      name,
      email,
      verified: true,
      createdAt: new Date(),
    }

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
} 