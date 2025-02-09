import { NextRequest } from 'next/server';

// Helper function to serialize BigInt
function serializeBigInt(data: any): any {
  if (typeof data === 'bigint') {
    return data.toString();
  }
  if (Array.isArray(data)) {
    return data.map(serializeBigInt);
  }
  if (typeof data === 'object' && data !== null) {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, serializeBigInt(value)])
    );
  }
  return data;
}

export async function GET(request: NextRequest) {
  console.log('🚀 [Next.js Permits API] Route handler triggered');
  console.log('🔍 [Next.js Permits API] Request URL:', request.url);
  console.log('🔑 [Next.js Permits API] Request method:', request.method);
  console.log('🌍 [Next.js Permits API] API_URL:', process.env.NEXT_PUBLIC_API_URL);

  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get('address');
  
  if (!process.env.NEXT_PUBLIC_API_URL) {
    console.error('❌ [Next.js Permits API] API_URL environment variable is not set');
    return Response.json(
      { error: 'API configuration error', details: 'API_URL is not configured' },
      { status: 500 }
    );
  }

  if (!address) {
    console.error('❌ [Next.js Permits API] No address provided');
    return Response.json(
      { error: 'Invalid request', details: 'Address parameter is required' },
      { status: 400 }
    );
  }

  try {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/permits?address=${address}`;
    console.log('🎯 [Next.js Permits API] Making request to:', url);

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📊 [Next.js Permits API] Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [Next.js Permits API] Error response:', errorText);
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    const serializedData = serializeBigInt(data);
    console.log('✅ [Next.js Permits API] Processed data:', serializedData);
    
    return Response.json(serializedData);
  } catch (error) {
    console.error('💥 [Next.js Permits API] Error:', error);
    return Response.json(
      { 
        error: 'Failed to fetch permits', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}