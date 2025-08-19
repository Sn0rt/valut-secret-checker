'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoginTab } from '@/components/LoginTab';
import { WrappingTab } from '@/components/WrappingTab';

interface AuthenticationCredentials {
  authMethod: 'approle';
  accessId: string;
  k8sNamespace: string;
  k8sSecretName: string;
  secretKey: string; // Key name within the Kubernetes secret
}

interface UnwrapCredentials {
  wrappedToken: string;
  notificationEmail?: string;
}

interface AuthenticationMethodProps {
  credentials: AuthenticationCredentials;
  unwrapCredentials: UnwrapCredentials;
  availableNamespaces: string[];
  onCredentialChange: (field: keyof AuthenticationCredentials, value: string) => void;
  onUnwrapCredentialChange: (field: keyof UnwrapCredentials, value: string) => void;
  onLogin: () => void;
  onLookup: () => void;
  onLogout: () => void;
  onUnwrap: () => void;
  loading: { login?: boolean; lookup?: boolean; logout?: boolean; unwrap?: boolean };
  token: string;
  emailConfigured?: boolean;
}

export function AuthenticationMethod({
  credentials,
  unwrapCredentials,
  availableNamespaces,
  onCredentialChange,
  onUnwrapCredentialChange,
  onLogin,
  onLookup,
  onLogout,
  onUnwrap,
  loading,
  token,
  emailConfigured = false
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
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="unwrap">Unwrap</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-6">
            <LoginTab
              credentials={credentials}
              availableNamespaces={availableNamespaces}
              onCredentialChange={onCredentialChange}
              onLogin={onLogin}
              onLookup={onLookup}
              onLogout={onLogout}
              loading={loading}
              token={token}
            />
          </TabsContent>

          <TabsContent value="unwrap" className="mt-6">
            <WrappingTab
              credentials={unwrapCredentials}
              onCredentialChange={onUnwrapCredentialChange}
              onUnwrap={onUnwrap}
              loading={loading}
              emailConfigured={emailConfigured}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}