/**
 * Utility function to build API endpoint URLs
 * 
 * Handles URL normalization, trailing slashes, and proper path concatenation.
 * 
 * @param baseUrl - The base API URL (e.g., 'http://localhost:3001' or 'http://localhost:3001/')
 * @param path - The API path (e.g., 'profile' or '/profile')
 * @returns Properly formatted URL with exactly one slash between base and path
 * 
 * @example
 * buildApiUrl('http://localhost:3001', 'profile') // 'http://localhost:3001/api/profile'
 * buildApiUrl('http://localhost:3001/', '/profile') // 'http://localhost:3001/api/profile'
 */
export function buildApiUrl(baseUrl: string, path: string): string {
  // Normalize baseUrl: remove trailing slashes
  const normalizedBase = baseUrl.replace(/\/+$/, '')
  
  // Normalize path: remove leading slashes, ensure it starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  
  // Ensure path starts with /api/ if it doesn't already
  const apiPath = normalizedPath.startsWith('/api/') 
    ? normalizedPath 
    : `/api${normalizedPath}`
  
  // Combine with exactly one slash between base and path
  return `${normalizedBase}${apiPath}`
}

