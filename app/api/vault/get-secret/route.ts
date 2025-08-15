import { NextRequest, NextResponse } from 'next/server';
import { axiosInstance } from '@/lib/axios';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, token, secretPath, keyName } = body;

    if (!endpoint || !token || !secretPath) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: endpoint, token, secretPath' },
        { status: 400 }
      );
    }

    const vaultUrl = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    
    let secretUrl: string;
    if (secretPath.startsWith('/')) {
      // Absolute path: append directly to endpoint
      secretUrl = `${vaultUrl}${secretPath}`;
    } else {
      // Relative path: use existing logic with /v1/secret/data/ prefix
      const cleanSecretPath = secretPath;
      secretUrl = `${vaultUrl}/v1/secret/data/${cleanSecretPath}`;
    }

    const response = await axiosInstance.get(secretUrl, {
      timeout: 10000,
      headers: {
        'X-Vault-Token': token,
        'Content-Type': 'application/json'
      }
    });

    const secretData = response.data.data?.data || {};
    
    // If keyName is provided, return only that key's value
    // Otherwise, return all keys and their values
    if (keyName && keyName.trim()) {
      const keyValue = secretData[keyName];
      return NextResponse.json({
        success: true,
        data: {
          secretPath: secretPath,
          keyName,
          keyValue: keyValue !== undefined ? keyValue : null,
          keyExists: keyValue !== undefined,
          requestedSingleKey: true,
          metadata: {
            created_time: response.data.data?.metadata?.created_time,
            deletion_time: response.data.data?.metadata?.deletion_time,
            destroyed: response.data.data?.metadata?.destroyed,
            version: response.data.data?.metadata?.version
          }
        }
      });
    } else {
      // Return all keys and values
      return NextResponse.json({
        success: true,
        data: {
          secretPath: secretPath,
          allSecrets: secretData,
          allKeys: Object.keys(secretData),
          totalKeys: Object.keys(secretData).length,
          requestedSingleKey: false,
          metadata: {
            created_time: response.data.data?.metadata?.created_time,
            deletion_time: response.data.data?.metadata?.deletion_time,
            destroyed: response.data.data?.metadata?.destroyed,
            version: response.data.data?.metadata?.version
          }
        }
      });
    }

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Vault secret retrieval error:', errorMessage);
    
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response: { status: number; statusText: string; data: unknown } };
      return NextResponse.json({
        success: false,
        error: `Secret retrieval failed: ${axiosError.response.status} ${axiosError.response.statusText}`,
        details: axiosError.response.data
      }, { status: axiosError.response.status });
    }

    return NextResponse.json({
      success: false,
      error: `Network error: ${errorMessage}`
    }, { status: 500 });
  }
}