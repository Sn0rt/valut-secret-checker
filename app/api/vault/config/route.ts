import { NextResponse } from 'next/server';
import { getVaultEndpoints, getAppTitle, getK8sNamespaces } from '@/lib/vault-config';

export async function GET() {
  try {
    const endpoints = getVaultEndpoints();
    const appTitle = getAppTitle();
    const namespaces = getK8sNamespaces();
    
    return NextResponse.json({ 
      success: true, 
      config: {
        title: appTitle,
        endpoints: endpoints,
        namespaces: namespaces
      }
    });
  } catch (error) {
    console.error('Error getting application config:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get application config' },
      { status: 500 }
    );
  }
}