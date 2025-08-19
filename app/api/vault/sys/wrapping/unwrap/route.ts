import { NextRequest, NextResponse } from 'next/server';
import { axiosInstance } from '@/lib/axios';
import { serverDebug, serverError } from '@/lib/server-logger';
import { sendUnwrapNotification } from '@/lib/email';

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();

  serverDebug(`[UNWRAP-${requestId}] Request started at ${new Date().toISOString()}`);

  try {
    const body = await request.json();
    const { endpoint, wrappedToken, notificationEmail } = body;

    serverDebug(`[UNWRAP-${requestId}] Request parameters:`, {
      endpoint,
      hasWrappedToken: !!wrappedToken,
      wrappedTokenLength: wrappedToken ? wrappedToken.length : 0,
      notificationEmail,
      hasBody: !!body
    });

    if (!endpoint || !wrappedToken) {
      serverDebug(`[UNWRAP-${requestId}] Validation failed: Missing required fields`);
      return NextResponse.json(
        { success: false, error: 'Missing required fields: endpoint, wrappedToken' },
        { status: 400 }
      );
    }

    const vaultUrl = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
    const unwrapUrl = `${vaultUrl}/v1/sys/wrapping/unwrap`;

    const payload: { token?: string } = {};
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    // For wrapped token unwrapping, we can either:
    // 1. Use X-Vault-Token header with the wrapped token
    // 2. Or send the token in the request body
    // Vault documentation suggests using the header approach
    headers['X-Vault-Token'] = wrappedToken;

    serverDebug(`[UNWRAP-${requestId}] Making Vault unwrap request to: ${unwrapUrl}`);

    const response = await axiosInstance.post(unwrapUrl, payload, {
      timeout: 10000,
      headers
    });

    serverDebug(`[UNWRAP-${requestId}] Vault unwrap successful, response status: ${response.status}`);

    const duration = Date.now() - startTime;
    serverDebug(`[UNWRAP-${requestId}] Request completed successfully in ${duration}ms`);

    // Send notification email if provided
    if (notificationEmail) {
      serverDebug(`[UNWRAP-${requestId}] Sending notification email to: ${notificationEmail}`);
      
      // Send notification asynchronously (don't block the response)
      sendUnwrapNotification(notificationEmail, {
        timestamp: new Date().toISOString(),
        endpoint: vaultUrl,
        success: true,
        userAgent: request.headers.get('user-agent') || undefined,
        ipAddress: request.headers.get('x-forwarded-for') || 
                  request.headers.get('x-real-ip') || 
                  'unknown'
      }).catch(error => {
        serverError(`[UNWRAP-${requestId}] Failed to send notification email:`, error);
      });
    }

    return NextResponse.json(response.data);

  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    serverError(`[UNWRAP-${requestId}] Request failed after ${duration}ms:`, errorMessage);

    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response: { status: number; statusText: string; data: unknown } };
      serverDebug(`[UNWRAP-${requestId}] Axios error details:`, {
        status: axiosError.response.status,
        statusText: axiosError.response.statusText,
        data: axiosError.response.data
      });

      return NextResponse.json({
        success: false,
        error: `Token unwrap failed: ${axiosError.response.status} ${axiosError.response.statusText}`,
        details: axiosError.response.data
      }, { status: axiosError.response.status });
    }

    return NextResponse.json({
      success: false,
      error: `Network error: ${errorMessage}`
    }, { status: 500 });
  }
}