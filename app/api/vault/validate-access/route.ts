import { NextRequest, NextResponse } from 'next/server';
import { axiosInstance } from '@/lib/axios';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, token, secretPath } = body;

    if (!endpoint || !token || !secretPath) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: endpoint, token, secretPath' },
        { status: 400 }
      );
    }

    const vaultUrl = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    
    // Build the path for capabilities check
    let pathForCheck: string;
    if (secretPath.startsWith('/')) {
      // Absolute path: use as-is but remove leading slash for capabilities API
      pathForCheck = secretPath.substring(1);
    } else {
      // Relative path: use existing logic with secret/data/ prefix
      pathForCheck = `secret/data/${secretPath}`;
    }

    const capabilitiesUrl = `${vaultUrl}/v1/sys/capabilities-self`;

    const response = await axiosInstance.post(capabilitiesUrl, {
      path: pathForCheck
    }, {
      timeout: 10000,
      headers: {
        'X-Vault-Token': token,
        'Content-Type': 'application/json'
      }
    });

    const capabilities = response.data.capabilities || [];
    const hasReadPermission = capabilities.includes('read');
    const hasListPermission = capabilities.includes('list');
    const hasWritePermission = capabilities.includes('write');
    const hasDeletePermission = capabilities.includes('delete');

    return NextResponse.json({
      success: true,
      data: {
        secretPath: secretPath,
        resolvedPath: pathForCheck,
        capabilities: capabilities,
        permissions: {
          read: hasReadPermission,
          list: hasListPermission,
          write: hasWritePermission,
          delete: hasDeletePermission
        },
        hasAccess: hasReadPermission || hasListPermission,
        summary: `Token has ${capabilities.length > 0 ? capabilities.join(', ') : 'no'} permissions on this path`
      }
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Vault permission validation error:', errorMessage);
    
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response: { status: number; statusText: string; data: unknown } };
      return NextResponse.json({
        success: false,
        error: `Permission validation failed: ${axiosError.response.status} ${axiosError.response.statusText}`,
        details: axiosError.response.data
      }, { status: axiosError.response.status });
    }

    return NextResponse.json({
      success: false,
      error: `Network error: ${errorMessage}`
    }, { status: 500 });
  }
}