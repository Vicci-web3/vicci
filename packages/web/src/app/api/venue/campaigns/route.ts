import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get('address');
  
  console.log('Next.js API Route - Fetching campaigns for address:', address);
  console.log('API URL:', process.env.API_URL);

  try {
    const url = `${process.env.API_URL}/venue/campaigns?address=${address}`;
    console.log('Making request to:', url);

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`API responded with status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Received data:', data);
    return Response.json(data);
  } catch (error) {
    console.error('Error proxying to API:', error);
    return Response.json(
      { error: 'Failed to fetch campaigns', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 