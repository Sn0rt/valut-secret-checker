export function getVaultEndpoints(): string[] {
  const defaultEndpoints = ["http://localhost:8200"];

  if (typeof window !== 'undefined') {
    return defaultEndpoints;
  }

  const vaultEndpoints = process.env.VAULT_ENDPOINTS;
  
  if (!vaultEndpoints) {
    return defaultEndpoints;
  }

  try {
    const endpoints = vaultEndpoints
      .split(',')
      .map(endpoint => endpoint.trim())
      .filter(endpoint => endpoint && endpoint.startsWith('http'));

    return endpoints.length > 0 ? endpoints : defaultEndpoints;
  } catch (error) {
    console.warn('Error parsing VAULT_ENDPOINTS:', error);
    return defaultEndpoints;
  }
}