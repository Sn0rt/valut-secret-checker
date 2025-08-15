import { NextRequest, NextResponse } from 'next/server';
import { axiosInstance } from '@/lib/axios';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, token } = body;

    if (!endpoint || !token) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: endpoint, token' },
        { status: 400 }
      );
    }

    const vaultUrl = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    const lookupUrl = `${vaultUrl}/v1/auth/token/lookup-self`;

    const response = await axiosInstance.get(lookupUrl, {
      timeout: 10000,
      headers: {
        'X-Vault-Token': token,
        'Content-Type': 'application/json'
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        id: response.data.data?.id,
        accessor: response.data.data?.accessor,
        creation_time: response.data.data?.creation_time,
        expire_time: response.data.data?.expire_time,
        ttl: response.data.data?.ttl,
        renewable: response.data.data?.renewable,
        policies: response.data.data?.policies,
        entity_id: response.data.data?.entity_id,
        display_name: response.data.data?.display_name
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Vault token lookup error:', errorMessage);
    
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response: { status: number; statusText: string; data: unknown } };
      return NextResponse.json({
        success: false,
        error: `Token lookup failed: ${axiosError.response.status} ${axiosError.response.statusText}`,
        details: axiosError.response.data
      }, { status: axiosError.response.status });
    }

    return NextResponse.json({
      success: false,
      error: `Network error: ${errorMessage}`
    }, { status: 500 });
  }
}