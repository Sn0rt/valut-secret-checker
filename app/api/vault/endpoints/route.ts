import { NextResponse } from 'next/server';
import { getVaultEndpoints } from '@/lib/vault-config';

export async function GET() {
  try {
    const endpoints = getVaultEndpoints();
    return NextResponse.json({ success: true, endpoints });
  } catch (error) {
    console.error('Error getting vault endpoints:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get vault endpoints' },
      { status: 500 }
    );
  }
}