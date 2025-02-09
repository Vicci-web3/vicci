import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('🚀 [Next.js Permits Update API] Route handler triggered');

  if (!process.env.NEXT_PUBLIC_API_URL) {
    console.error('❌ [Next.js Permits Update API] API_URL environment variable is not set');
    return Response.json(
      { error: 'API configuration error', details: 'API_URL is not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { permitId, claimedAt } = body;

    if (!permitId || !claimedAt) {
      console.error('❌ [Next.js Permits Update API] Missing required fields');
      return Response.json(
        { error: 'Invalid request', details: 'permitId and claimedAt are required' },
        { status: 400 }
      );
    }

    console.log('🎯 [Next.js Permits Update API] Updating permit:', permitId);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/permits/${permitId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ claimedAt }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [Next.js Permits Update API] Error response:', errorText);
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ [Next.js Permits Update API] Update successful:', data);
    
    return Response.json(data);
  } catch (error) {
    console.error('💥 [Next.js Permits Update API] Error:', error);
    return Response.json(
      { 
        error: 'Failed to update permit', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 