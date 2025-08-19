'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface UnwrapCredentials {
  wrappedToken: string;
  notificationEmail?: string;
}

interface WrappingTabProps {
  credentials: UnwrapCredentials;
  onCredentialChange: (field: keyof UnwrapCredentials, value: string) => void;
  onUnwrap: () => void;
  loading: { unwrap?: boolean };
  emailConfigured?: boolean;
}

export function WrappingTab({
  credentials,
  onCredentialChange,
  onUnwrap,
  loading,
  emailConfigured = false
}: WrappingTabProps) {
  return (
    <div className="space-y-6">
      {/* Wrapped Token */}
      <div className="flex items-start justify-between">
        <Label htmlFor="wrapped-token" className="min-w-[140px] mt-2">Wrapped Token</Label>
        <Textarea
          id="wrapped-token"
          placeholder="hvs.CAESIJlWh..."
          value={credentials.wrappedToken}
          onChange={(e) => onCredentialChange('wrappedToken', e.target.value)}
          className="w-80 min-h-[100px] font-mono text-sm"
          rows={4}
        />
      </div>

      {/* Notification Email (Optional) */}
      <div className="flex items-center justify-between">
        <Label htmlFor="notification-email" className="min-w-[140px]">
          Notification CC (Email)
          <span className="text-xs text-gray-500 ml-1">(optional)</span>
        </Label>
        <Input
          id="notification-email"
          type="email"
          placeholder="user1@example.com, user2@example.com"
          value={credentials.notificationEmail || ''}
          onChange={(e) => onCredentialChange('notificationEmail', e.target.value)}
          className="w-80"
          disabled={!emailConfigured}
        />
      </div>

      {/* Bottom section with SMTP status and Unwrap button */}
      <div className="flex justify-between items-center pt-4">
        {/* SMTP Status - Left side */}
        <div className="flex items-center">
          <div className={`w-2 h-2 rounded-full mr-1 ${emailConfigured ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className={`text-xs ${emailConfigured ? 'text-green-600' : 'text-red-600'}`}>
            SMTP {emailConfigured ? 'Configured' : 'Not Configured'}
          </span>
        </div>
        
        {/* Unwrap Button - Right side */}
        <Button
          onClick={onUnwrap}
          disabled={loading.unwrap || !credentials.wrappedToken}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        >
          {loading.unwrap && <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>}
          Unwrap
        </Button>
      </div>
    </div>
  );
}