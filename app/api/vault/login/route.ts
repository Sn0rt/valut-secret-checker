import { NextRequest, NextResponse } from 'next/server';
import { axiosInstance } from '@/lib/axios';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, accessId, accessKey, authMethod = 'approle' } = body;

    if (!endpoint || !accessId || !accessKey) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: endpoint, accessId, accessKey' },
        { status: 400 }
      );
    }

    const vaultUrl = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    
    let loginUrl: string;
    let loginPayload: object;
    
    if (authMethod === 'approle') {
      loginUrl = `${vaultUrl}/v1/auth/approle/login`;
      loginPayload = {
        role_id: accessId,
        secret_id: accessKey
      };
    } else {
      // Fallback to userpass for backward compatibility
      loginUrl = `${vaultUrl}/v1/auth/userpass/login/${accessId}`;
      loginPayload = {
        password: accessKey
      };
    }

    const response = await axiosInstance.post(loginUrl, loginPayload, {
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        auth: response.data.auth,
        token: response.data.auth?.client_token,
        renewable: response.data.auth?.renewable,
        lease_duration: response.data.auth?.lease_duration
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Vault login error:', errorMessage);
    
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response: { status: number; statusText: string; data: unknown } };
      return NextResponse.json({
        success: false,
        error: `Vault login failed: ${axiosError.response.status} ${axiosError.response.statusText}`,
        details: axiosError.response.data
      }, { status: axiosError.response.status });
    }

    return NextResponse.json({
      success: false,
      error: `Network error: ${errorMessage}`
    }, { status: 500 });
  }
}