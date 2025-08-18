'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';

interface PermissionValidationProps {
  secretPath: string;
  endpoint: string;
  onSecretPathChange: (path: string) => void;
  onValidateAccess: () => void;
  loading: { validateAccess?: boolean };
  disabled: boolean;
}

export function PermissionValidation({
  secretPath,
  endpoint,
  onSecretPathChange,
  onValidateAccess,
  loading,
  disabled
}: PermissionValidationProps) {
  return (
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="secret-path" className="min-w-[100px]">Secret Path</Label>
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
              value={secretPath}
              onChange={(e) => onSecretPathChange(e.target.value)}
              className="w-80"
            />
          </div>

          {secretPath && endpoint && (
            <div className="text-xs text-muted-foreground p-2 bg-blue-50 rounded-md border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="font-medium text-blue-800">Final URL Preview:</div>
                <div className="font-mono text-blue-700 break-all">
                  {endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint}
                  {secretPath.startsWith('/')
                    ? secretPath
                    : `/v1/secret/data/${secretPath}`
                  }
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <Button
              onClick={onValidateAccess}
              disabled={disabled || loading.validateAccess}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading.validateAccess && <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>}
              Validate Access
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}