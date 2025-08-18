import { NextRequest, NextResponse } from 'next/server';
import { axiosInstance } from '@/lib/axios';
import * as k8s from '@kubernetes/client-node';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      endpoint,
      accessId,
      k8sNamespace,
      k8sSecretName,
      secretKey
    } = body;

    if (!endpoint || !accessId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: endpoint, accessId' },
        { status: 400 }
      );
    }

    // For AppRole, always fetch secret from Kubernetes
    if (!k8sNamespace || !k8sSecretName || !secretKey) {
      return NextResponse.json(
        { success: false, error: 'Missing Kubernetes secret reference fields: namespace, secretName, secretKey' },
        { status: 400 }
      );
    }

    let finalAccessKey: string;

    // Fetch secret directly from Kubernetes (server-side only, no API call)
    try {
      // Initialize Kubernetes client
      const kc = new k8s.KubeConfig();

      // Try to load from KUBECONFIG environment variable first, fallback to in-cluster
      try {
        if (process.env.KUBECONFIG) {
          kc.loadFromFile(process.env.KUBECONFIG);
        } else {
          kc.loadFromCluster();
        }
      } catch (configError) {
        console.error('Failed to load Kubernetes config:', configError);
        return NextResponse.json({
          success: false,
          error: 'Failed to initialize Kubernetes client. Ensure KUBECONFIG is set or running in cluster.'
        }, { status: 500 });
      }

      const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

      // Get the secret from Kubernetes
      const secret = await k8sApi.readNamespacedSecret({
        name: k8sSecretName,
        namespace: k8sNamespace
      });
      const secretData = secret.data;

      if (!secretData || !secretData[secretKey]) {
        return NextResponse.json({
          success: false,
          error: `Secret key '${secretKey}' not found in secret '${k8sSecretName}' in namespace '${k8sNamespace}'`
        }, { status: 404 });
      }

      // Decode the base64 encoded secret value (stays on server)
      finalAccessKey = Buffer.from(secretData[secretKey], 'base64').toString('utf-8');

    } catch (k8sError: unknown) {
      console.error('Kubernetes secret fetch error:', k8sError);

      if (k8sError && typeof k8sError === 'object' && 'response' in k8sError) {
        const k8sApiError = k8sError as { response: { statusCode: number; statusMessage: string; body: unknown } };

        if (k8sApiError.response.statusCode === 404) {
          return NextResponse.json({
            success: false,
            error: `Secret '${k8sSecretName}' not found in namespace '${k8sNamespace}'`
          }, { status: 404 });
        } else if (k8sApiError.response.statusCode === 403) {
          return NextResponse.json({
            success: false,
            error: 'Insufficient permissions to read secrets. Check RBAC configuration.'
          }, { status: 403 });
        }
      }

      const errorMessage = k8sError instanceof Error ? k8sError.message : 'Unknown Kubernetes error';
      return NextResponse.json({
        success: false,
        error: `Kubernetes secret fetch error: ${errorMessage}`
      }, { status: 500 });
    }

    // Validate that we have the final access key
    if (!finalAccessKey) {
      return NextResponse.json(
        { success: false, error: 'Missing accessKey from Kubernetes secret' },
        { status: 400 }
      );
    }

    const vaultUrl = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;

    const loginUrl = `${vaultUrl}/v1/auth/approle/login`;
    const loginPayload = {
      role_id: accessId,
      secret_id: finalAccessKey
    };

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