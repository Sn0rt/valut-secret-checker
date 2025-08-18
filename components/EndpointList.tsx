'use client';

import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Combobox } from '@/components/ui/combobox';

interface EndpointListProps {
  availableEndpoints: string[];
  currentEndpoint: string;
  onEndpointChange: (endpoint: string) => void;
}

export function EndpointList({
  availableEndpoints,
  currentEndpoint,
  onEndpointChange
}: EndpointListProps) {
  return (
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
        <div className="flex items-center justify-between">
          <Label htmlFor="endpoint-select" className="min-w-[100px]">Endpoint</Label>
          <Combobox
            options={availableEndpoints}
            value={currentEndpoint}
            onValueChange={onEndpointChange}
            placeholder="Select or enter vault endpoint..."
            emptyText="No endpoints found. Type to add custom endpoint."
            allowCustom={true}
            className="w-80"
          />
        </div>
      </CardContent>
    </Card>
  );
}