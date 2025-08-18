'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import JsonView from '@uiw/react-json-view';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getVaultEndpoints, getAppTitle, type ConfigResponse } from '@/lib/vault-config';
import { EndpointList } from '@/components/EndpointList';
import { AuthenticationMethod } from '@/components/AuthenticationMethod';
import { PermissionValidation } from '@/components/PermissionValidation';

interface VaultCredentials {
  endpoint: string;
  accessId: string;
  accessKey: string;
  secretPath: string;
  authMethod: 'approle';
  k8sNamespace: string; // Kubernetes namespace
  k8sSecretName: string; // Kubernetes secret name
  secretKey: string; // Key name within the Kubernetes secret
}

// Custom hook for localStorage persistence
function useLocalStorage(key: string, initialValue: string) {
  const [storedValue, setStoredValue] = useState<string>(initialValue);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        setStoredValue(item);
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
    }
  }, [key]);

  const setValue = (value: string) => {
    try {
      setStoredValue(value);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, value);
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  };

  return [storedValue, setValue] as const;
}

export default function Home() {
  // Get default title (will be overridden by config API)
  const defaultAppTitle = getAppTitle();
  const [appTitle, setAppTitle] = useState<string>(defaultAppTitle);

  // Get endpoints from environment variable
  const vaultEndpoints = getVaultEndpoints();
  const defaultEndpoint = vaultEndpoints[0];

  const [availableEndpoints, setAvailableEndpoints] = useState<string[]>(vaultEndpoints);
  const [endpoint, setEndpoint] = useState<string>('');

  // Use localStorage for non-sensitive fields
  const [storedEndpoint, setStoredEndpoint] = useLocalStorage('vault-endpoint', defaultEndpoint);
  const [storedAccessId, setStoredAccessId] = useLocalStorage('vault-accessId', '');
  const [storedSecretPath, setStoredSecretPath] = useLocalStorage('vault-secretPath', '');
  const [storedK8sNamespace, setStoredK8sNamespace] = useLocalStorage('vault-k8sNamespace', '');
  const [storedK8sSecretName, setStoredK8sSecretName] = useLocalStorage('vault-k8sSecretName', '');
  const [storedSecretKey, setStoredSecretKey] = useLocalStorage('vault-secretKey', 'secret-id');

  const [credentials, setCredentials] = useState<VaultCredentials>({
    endpoint: storedEndpoint || defaultEndpoint,
    accessId: storedAccessId,
    accessKey: '', // Never store passwords/secrets for security
    secretPath: storedSecretPath,
    authMethod: 'approle',
    k8sNamespace: storedK8sNamespace,
    k8sSecretName: storedK8sSecretName,
    secretKey: storedSecretKey
  });

  // Initialize endpoint state
  useEffect(() => {
    setEndpoint(storedEndpoint || defaultEndpoint);
  }, [storedEndpoint, defaultEndpoint]);

  const [loading, setLoading] = useState<{
    login?: boolean;
    lookup?: boolean;
    validateAccess?: boolean;
  }>({});

  const [token, setToken] = useState<string>('');

  // Load application config (title and endpoints) from server
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await axios.get<ConfigResponse>('/api/vault/config');
        if (response.data.success && response.data.config) {
          setAppTitle(response.data.config.title);
          setAvailableEndpoints(response.data.config.endpoints);
        }
      } catch (error) {
        console.warn('Failed to load config from server, using defaults:', error);
      }
    };
    loadConfig();
  }, []);

  // Sync credentials with localStorage values when they change
  useEffect(() => {
    setCredentials(prev => ({
      ...prev,
      endpoint: endpoint,
      accessId: storedAccessId,
      secretPath: storedSecretPath,
      authMethod: 'approle',
      k8sNamespace: storedK8sNamespace,
      k8sSecretName: storedK8sSecretName,
      secretKey: storedSecretKey
    }));
  }, [endpoint, storedAccessId, storedSecretPath, storedK8sNamespace, storedK8sSecretName, storedSecretKey]);

  const handleEndpointChange = (value: string) => {
    setEndpoint(value);
    setStoredEndpoint(value);
  };

  const showJsonToast = (title: string, data: unknown, isSuccess: boolean = true) => {
    if (isSuccess) {
      toast.success(title, {
        description: (
          <div className="max-w-md max-h-64 overflow-auto">
            <JsonView
              value={data as object}
              style={{
                backgroundColor: 'transparent',
                fontSize: '12px',
                '--w-rjv-font-family': 'var(--font-geist-mono), Monaco, Menlo, monospace',
                '--w-rjv-color-default': '#374151',
                '--w-rjv-color-string': '#059669',
                '--w-rjv-color-number': '#dc2626',
                '--w-rjv-color-boolean': '#7c2d12',
                '--w-rjv-color-null': '#6b7280',
                '--w-rjv-color-undefined': '#6b7280',
                '--w-rjv-color-key': '#1f2937',
              } as React.CSSProperties}
              collapsed={false}
              displayDataTypes={false}
              displayObjectSize={false}
            />
          </div>
        )
      });
    } else {
      toast.error(title);
    }
  };

  const handleInputChange = (field: keyof VaultCredentials, value: string) => {
    setCredentials(prev => ({
      ...prev,
      [field]: value
    }));

    // Persist non-sensitive fields to localStorage
    switch (field) {
      case 'endpoint':
        setStoredEndpoint(value);
        break;
      case 'accessId':
        setStoredAccessId(value);
        break;
      case 'secretPath':
        setStoredSecretPath(value);
        break;
      case 'k8sNamespace':
        setStoredK8sNamespace(value);
        break;
      case 'k8sSecretName':
        setStoredK8sSecretName(value);
        break;
      case 'secretKey':
        setStoredSecretKey(value);
        break;
      // accessKey is intentionally not persisted for security reasons
    }
  };

  const testLogin = async () => {
    if (!endpoint || !credentials.accessId) {
      toast.error('Please fill in endpoint and access ID');
      return;
    }

    // For AppRole, validate K8s secret fields
    if (!credentials.k8sNamespace || !credentials.k8sSecretName || !credentials.secretKey) {
      toast.error('Please fill in all Kubernetes secret reference fields');
      return;
    }

    setLoading(prev => ({ ...prev, login: true }));
    try {
      const response = await axios.post('/api/vault/login', {
        endpoint: endpoint,
        accessId: credentials.accessId,
        authMethod: credentials.authMethod,
        k8sNamespace: credentials.k8sNamespace,
        k8sSecretName: credentials.k8sSecretName,
        secretKey: credentials.secretKey
      });

      const result = response.data;

      if (result.success && result.data?.token) {
        setToken(result.data.token);
        toast.success('Login successful! Token retrieved.');
      } else {
        toast.error('Login failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const axiosError = error && typeof error === 'object' && 'response' in error
        ? error as { response: { data: { error?: string } } }
        : null;

      toast.error('Login failed: ' + (axiosError?.response?.data?.error || errorMessage));
    } finally {
      setLoading(prev => ({ ...prev, login: false }));
    }
  };

  const testLookup = async () => {
    if (!endpoint || !token) {
      toast.error('Please login first to get a token');
      return;
    }

    setLoading(prev => ({ ...prev, lookup: true }));
    try {
      const response = await axios.post('/api/vault/lookup', {
        endpoint: endpoint,
        token: token
      });

      const result = response.data;
      if (result.success) {
        showJsonToast('Token lookup successful!', result.data);
      } else {
        toast.error('Token lookup failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const axiosError = error && typeof error === 'object' && 'response' in error
        ? error as { response: { data: { error?: string } } }
        : null;

      toast.error('Token lookup failed: ' + (axiosError?.response?.data?.error || errorMessage));
    } finally {
      setLoading(prev => ({ ...prev, lookup: false }));
    }
  };

  const testValidateAccess = async () => {
    if (!endpoint || !token || !credentials.secretPath) {
      toast.error('Please login first and fill in secret path');
      return;
    }

    setLoading(prev => ({ ...prev, validateAccess: true }));
    try {
      const response = await axios.post('/api/vault/validate-access', {
        endpoint: endpoint,
        token: token,
        secretPath: credentials.secretPath
      });

      const result = response.data;
      if (result.success) {
        const permissionData = {
          path: result.data.secretPath,
          resolvedPath: result.data.resolvedPath,
          capabilities: result.data.capabilities,
          permissions: result.data.permissions,
          summary: result.data.summary,
          hasAccess: result.data.hasAccess
        };

        showJsonToast('Permission validation successful!', permissionData);
      } else {
        toast.error('Permission validation failed: ' + (result.error || 'Unknown error'));
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const axiosError = error && typeof error === 'object' && 'response' in error
        ? error as { response: { data: { error?: string } } }
        : null;

      toast.error('Permission validation failed: ' + (axiosError?.response?.data?.error || errorMessage));
    } finally {
      setLoading(prev => ({ ...prev, validateAccess: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto py-12 px-4">
        <div className="flex justify-center">
          <Card className="w-full max-w-5xl shadow-xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-left pb-8">
              <CardTitle className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                {appTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Step 1: Vault Endpoint */}
              <EndpointList
                availableEndpoints={availableEndpoints}
                currentEndpoint={endpoint}
                onEndpointChange={handleEndpointChange}
              />

              {/* Step 2: Authentication Method */}
              <AuthenticationMethod
                credentials={{
                  authMethod: credentials.authMethod,
                  accessId: credentials.accessId,
                  accessKey: credentials.accessKey,
                  k8sNamespace: credentials.k8sNamespace,
                  k8sSecretName: credentials.k8sSecretName,
                  secretKey: credentials.secretKey
                }}
                onCredentialChange={handleInputChange}
                onLogin={testLogin}
                onLookup={testLookup}
                loading={loading}
                token={token}
              />

              {/* Step 3: Permission Validation */}
              <PermissionValidation
                secretPath={credentials.secretPath}
                endpoint={endpoint}
                onSecretPathChange={(path) => handleInputChange('secretPath', path)}
                onValidateAccess={testValidateAccess}
                loading={loading}
                disabled={!token}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
