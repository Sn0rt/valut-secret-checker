export function getVaultEndpoints(): string[] {
  const defaultEndpoints = ["http://localhost:8200"];

  if (typeof window !== 'undefined') {
    // Client-side: use the environment variable directly
    const vaultEndpoints = process.env.NEXT_PUBLIC_VAULT_ENDPOINTS;
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
      console.warn('Error parsing NEXT_PUBLIC_VAULT_ENDPOINTS:', error);
      return defaultEndpoints;
    }
  }

  // Server-side: use the same environment variable
  const vaultEndpoints = process.env.NEXT_PUBLIC_VAULT_ENDPOINTS;
  
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
    console.warn('Error parsing NEXT_PUBLIC_VAULT_ENDPOINTS:', error);
    return defaultEndpoints;
  }
}

export function getAppTitle(): string {
  const defaultTitle = "HashiCorp Vault Credential Validator";

  if (typeof window !== 'undefined') {
    // Client-side: use the environment variable directly
    const appTitle = process.env.NEXT_PUBLIC_APP_TITLE;
    return appTitle && appTitle.trim() ? appTitle.trim() : defaultTitle;
  }

  // Server-side: use the same environment variable
  const appTitle = process.env.NEXT_PUBLIC_APP_TITLE;
  return appTitle && appTitle.trim() ? appTitle.trim() : defaultTitle;
}