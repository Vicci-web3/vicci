import { NextResponse } from 'next/server'
import { SiweMessage } from 'siwe'

export async function POST(request: Request) {
  try {
    const { message, signature } = await request.json()

    if (!message || !signature) {
      return NextResponse.json(
        { error: 'Missing message or signature' },
        { status: 400 }
      )
    }

    try {
      const siweMessage = new SiweMessage(message)
      const { success, data: fields } = await siweMessage.verify({ 
        signature,
        domain: request.headers.get('host') || undefined,
        nonce: siweMessage.nonce
      })

      console.log('SIWE verification result:', { success, fields })

      if (!success) {
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        )
      }

      // You might want to store the session/verification state here
      // For now, we'll just return success

      return NextResponse.json({ 
        success: true,
        address: fields.address 
      })

    } catch (error) {
      console.error('SIWE verification error:', error)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    )
  }
} 