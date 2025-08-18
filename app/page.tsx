'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import JsonView from '@uiw/react-json-view';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Info } from 'lucide-react';
import { getVaultEndpoints, getAppTitle } from '@/lib/vault-config';

interface VaultCredentials {
  endpoint: string;
  accessId: string;
  accessKey: string;
  secretPath: string;
  keyName: string; // Optional - if empty, returns all keys
  authMethod: 'approle' | 'userpass';
}

// Custom hook for localStorage persistence
function useLocalStorage(key: string, initialValue: string) {
  const [storedValue, setStoredValue] = useState<string>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? item : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

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
  // Get the app title from environment variable or use default
  const appTitle = getAppTitle();

  // Get endpoints from environment variable
  const vaultEndpoints = getVaultEndpoints();
  const defaultEndpoint = vaultEndpoints[0];

  const [availableEndpoints, setAvailableEndpoints] = useState<string[]>(vaultEndpoints);
  const [endpoint, setEndpoint] = useState<string>('');

  // Use localStorage for non-sensitive fields
  const [storedEndpoint, setStoredEndpoint] = useLocalStorage('vault-endpoint', defaultEndpoint);
  const [storedAccessId, setStoredAccessId] = useLocalStorage('vault-accessId', '');
  const [storedSecretPath, setStoredSecretPath] = useLocalStorage('vault-secretPath', '');
  const [storedKeyName, setStoredKeyName] = useLocalStorage('vault-keyName', '');
  const [storedAuthMethod, setStoredAuthMethod] = useLocalStorage('vault-authMethod', 'approle');

  const [credentials, setCredentials] = useState<VaultCredentials>({
    endpoint: storedEndpoint || defaultEndpoint,
    accessId: storedAccessId,
    accessKey: '', // Never store passwords/secrets for security
    secretPath: storedSecretPath,
    keyName: storedKeyName,
    authMethod: storedAuthMethod as 'approle' | 'userpass'
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

  // Load available endpoints from server
  useEffect(() => {
    const loadEndpoints = async () => {
      try {
        const response = await axios.get('/api/vault/endpoints');
        if (response.data.success) {
          setAvailableEndpoints(response.data.endpoints);
        }
      } catch (error) {
        console.warn('Failed to load endpoints from server, using defaults:', error);
      }
    };
    loadEndpoints();
  }, []);

  // Sync credentials with localStorage values when they change
  useEffect(() => {
    setCredentials(prev => ({
      ...prev,
      endpoint: endpoint,
      accessId: storedAccessId,
      secretPath: storedSecretPath,
      keyName: storedKeyName,
      authMethod: storedAuthMethod as 'approle' | 'userpass'
    }));
  }, [endpoint, storedAccessId, storedSecretPath, storedKeyName, storedAuthMethod]);

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
      case 'keyName':
        setStoredKeyName(value);
        break;
      case 'authMethod':
        setStoredAuthMethod(value);
        break;
      // accessKey is intentionally not persisted for security reasons
    }
  };

  const testLogin = async () => {
    if (!credentials.endpoint || !credentials.accessId || !credentials.accessKey) {
      toast.error('Please fill in endpoint, access ID, and access key');
      return;
    }

    setLoading(prev => ({ ...prev, login: true }));
    try {
      const response = await axios.post('/api/vault/login', {
        endpoint: credentials.endpoint,
        accessId: credentials.accessId,
        accessKey: credentials.accessKey,
        authMethod: credentials.authMethod
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
    if (!credentials.endpoint || !token) {
      toast.error('Please login first to get a token');
      return;
    }

    setLoading(prev => ({ ...prev, lookup: true }));
    try {
      const response = await axios.post('/api/vault/lookup', {
        endpoint: credentials.endpoint,
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
    if (!credentials.endpoint || !token || !credentials.secretPath) {
      toast.error('Please login first and fill in secret path');
      return;
    }

    setLoading(prev => ({ ...prev, validateAccess: true }));
    try {
      const response = await axios.post('/api/vault/validate-access', {
        endpoint: credentials.endpoint,
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
              <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-semibold text-slate-700 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">1</span>
                    </div>
                    Endpoint Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="endpoint-select">Vault Endpoint</Label>
                    <Combobox
                      options={availableEndpoints}
                      value={endpoint}
                      onValueChange={handleEndpointChange}
                      placeholder="Select or enter vault endpoint..."
                      emptyText="No endpoints found. Type to add custom endpoint."
                      allowCustom={true}
                      className="w-full"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Step 2: Authentication Method */}
              <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-semibold text-slate-700 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-green-600">2</span>
                    </div>
                    Authentication Method
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="auth-type">Authentication Type</Label>
                      <Select
                        value={credentials.authMethod}
                        onValueChange={(value) => handleInputChange('authMethod', value)}
                      >
                        <SelectTrigger id="auth-type">
                          <SelectValue placeholder="Select authentication method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="approle">AppRole</SelectItem>
                          <SelectItem value="userpass">Username / Password</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="access-id">
                        {credentials.authMethod === 'approle' ? 'Role ID' : 'Username'}
                      </Label>
                      <Input
                        id="access-id"
                        type="text"
                        placeholder={credentials.authMethod === 'approle' ? 'your-role-id' : 'your-username'}
                        value={credentials.accessId}
                        onChange={(e) => handleInputChange('accessId', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="access-key">
                        {credentials.authMethod === 'approle' ? 'Secret ID' : 'Password'}
                      </Label>
                      <Input
                        id="access-key"
                        type="password"
                        placeholder={credentials.authMethod === 'approle' ? 'your-secret-id' : 'your-password'}
                        value={credentials.accessKey}
                        onChange={(e) => handleInputChange('accessKey', e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col justify-end">
                      <div className="flex gap-2">
                        <Button
                          onClick={testLogin}
                          disabled={loading.login || !credentials.endpoint || !credentials.accessId || !credentials.accessKey}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          {loading.login && <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>}
                          Login
                        </Button>

                        <Button
                          onClick={testLookup}
                          disabled={loading.lookup || !token}
                          className="flex-1 bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
                          variant="outline"
                        >
                          {loading.lookup && <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>}
                          Lookup
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Step 3: Permission Validation */}
              <Card className="border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl font-semibold text-slate-700 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <span className="text-sm font-bold text-purple-600">3</span>
                    </div>
                    Permission Validation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="secret-path">Secret Path</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p>
                              <strong>Absolute path:</strong> Start with &apos;/&apos; to use the full path (e.g., &apos;/v1/secret/data/myapp/config&apos;).<br />
                              <strong>Relative path:</strong> Enter path after &apos;secret/&apos; (e.g., &apos;myapp/config&apos; becomes &apos;/v1/secret/data/myapp/config&apos;).
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="secret-path"
                        type="text"
                        placeholder="myapp/config or /v1/secret/data/myapp/config"
                        value={credentials.secretPath}
                        onChange={(e) => handleInputChange('secretPath', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="key-name">Key Name (Optional)</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <p>Not used for permission validation. Leave empty for path-level access check.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="key-name"
                        type="text"
                        placeholder="Not used for permission validation"
                        value={credentials.keyName}
                        onChange={(e) => handleInputChange('keyName', e.target.value)}
                      />
                    </div>

                    <div className="flex flex-col justify-end h-full">
                      <Button
                        onClick={testValidateAccess}
                        disabled={loading.validateAccess || !token}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-6"
                      >
                        {loading.validateAccess && <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>}
                        Validate Access
                      </Button>
                    </div>
                  </div>
                  {credentials.secretPath && credentials.endpoint ? (
                    <div className="mt-4 text-xs text-muted-foreground p-3 bg-blue-50 rounded-md border border-blue-200">
                      <div className="font-medium text-blue-800 mb-1">Final URL Preview:</div>
                      <div className="font-mono text-blue-700 break-all">
                        {credentials.endpoint.endsWith('/') ? credentials.endpoint.slice(0, -1) : credentials.endpoint}
                        {credentials.secretPath.startsWith('/')
                          ? credentials.secretPath
                          : `/v1/secret/data/${credentials.secretPath}`
                        }
                      </div>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {token && (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="pt-4">
                    <div className="text-sm font-medium text-green-800">Current Token:</div>
                    <div className="text-xs text-green-700 font-mono break-all mt-1">{token}</div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
