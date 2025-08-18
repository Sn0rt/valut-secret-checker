'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Function to mask role ID - preserve UUID format, mask middle segments
function maskRoleId(roleId: string): string {
  if (!roleId || roleId.length === 0) return roleId;

  // Check if it's a UUID format (contains dashes)
  if (roleId.includes('-')) {
    const parts = roleId.split('-');
    if (parts.length >= 3) {
      // Keep first and last part, mask middle parts
      const firstPart = parts[0];
      const lastPart = parts[parts.length - 1];
      const middleParts = parts.slice(1, -1).map(part => '*'.repeat(part.length));

      return [firstPart, ...middleParts, lastPart].join('-');
    }
  }

  // Fallback for non-UUID strings: keep first 2 and last 2 characters
  if (roleId.length <= 4) return roleId;

  const firstPart = roleId.substring(0, 2);
  const lastPart = roleId.substring(roleId.length - 2);
  const middleLength = roleId.length - 4;
  const maskedMiddle = '*'.repeat(middleLength);

  return `${firstPart}${maskedMiddle}${lastPart}`;
}

interface AuthenticationCredentials {
  authMethod: 'approle';
  accessId: string;
  accessKey: string;
  k8sNamespace: string;
  k8sSecretName: string;
  secretKey: string; // Key name within the Kubernetes secret
}

interface AuthenticationMethodProps {
  credentials: AuthenticationCredentials;
  availableNamespaces: string[];
  onCredentialChange: (field: keyof AuthenticationCredentials, value: string) => void;
  onLogin: () => void;
  onLookup: () => void;
  loading: { login?: boolean; lookup?: boolean };
  token: string;
}

export function AuthenticationMethod({
  credentials,
  availableNamespaces,
  onCredentialChange,
  onLogin,
  onLookup,
  loading,
  token
}: AuthenticationMethodProps) {
  return (
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
        <div className="space-y-6">
          {/* 第一行: Authentication Type - 标签左侧，下拉框最右侧 */}
          <div className="flex items-center justify-between">
            <Label htmlFor="auth-type" className="min-w-[140px]">Authentication Type</Label>
            <Select
              value={credentials.authMethod}
              onValueChange={(value) => onCredentialChange('authMethod', value)}
            >
              <SelectTrigger id="auth-type" className="w-64">
                <SelectValue placeholder="Select authentication method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approle">AppRole</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 第二行: Role ID - 标签左侧，输入框最右侧 */}
          <div className="flex items-center justify-between">
            <Label htmlFor="access-id" className="min-w-[140px]">Role ID</Label>
            <Input
              id="access-id"
              type="text"
              placeholder="your-role-id"
              value={credentials.accessId ? maskRoleId(credentials.accessId) : ''}
              onChange={(e) => onCredentialChange('accessId', e.target.value)}
              className="w-80"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">Secret Key Reference</Label>
            <div className="flex gap-4">
              <div className="flex items-center gap-2 flex-1">
                <Label htmlFor="k8s-namespace" className="min-w-[80px] text-sm">Namespace</Label>
                <Select
                  value={credentials.k8sNamespace}
                  onValueChange={(value) => onCredentialChange('k8sNamespace', value)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select namespace" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableNamespaces.map((namespace) => (
                      <SelectItem key={namespace} value={namespace}>
                        {namespace}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 flex-1">
                <Label htmlFor="k8s-secret-name" className="min-w-[80px] text-sm">Secret Name</Label>
                <Input
                  id="k8s-secret-name"
                  type="text"
                  placeholder="vault-secrets"
                  value={credentials.k8sSecretName}
                  onChange={(e) => onCredentialChange('k8sSecretName', e.target.value)}
                  className="flex-1"
                />
              </div>

              <div className="flex items-center gap-2 flex-1">
                <Label htmlFor="secret-key" className="min-w-[80px] text-sm">Key of Secret</Label>
                <Input
                  id="secret-key"
                  type="text"
                  placeholder="secret-id"
                  value={credentials.secretKey}
                  onChange={(e) => onCredentialChange('secretKey', e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* 按钮独立在右下角 */}
          <div className="flex justify-end pt-4">
            <div className="flex gap-2">
              <Button
                onClick={onLogin}
                disabled={
                  loading.login ||
                  !credentials.k8sNamespace ||
                  !credentials.k8sSecretName ||
                  !credentials.secretKey
                }
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading.login && <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>}
                Login
              </Button>

              <Button
                onClick={onLookup}
                disabled={loading.lookup || !token}
                className="bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
                variant="outline"
              >
                {loading.lookup && <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>}
                Lookup
              </Button>
            </div>
          </div>

          {/* Current Token Display */}
          {token && (
            <div className="mt-6 p-4 border border-green-200 bg-green-50 rounded-lg">
              <div className="text-sm font-medium text-green-800 mb-2">Current Token:</div>
              <div className="text-xs text-green-700 font-mono break-all bg-white p-2 rounded border border-green-200">
                {token}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}