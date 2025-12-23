/**
 * Helper function to construct backend API URLs
 * Ensures consistent endpoint construction and avoids double slashes
 * 
 * @param baseUrl - Base URL (e.g., https://backend.com or https://backend.com/api)
 * @param endpoint - API endpoint path (e.g., 'profile' or 'interests')
 * @returns Full URL with /api prefix
 * 
 * @example
 * buildApiUrl('https://backend.com', 'profile') // => 'https://backend.com/api/profile'
 * buildApiUrl('https://backend.com/api', 'profile') // => 'https://backend.com/api/profile'
 */
export function buildApiUrl(baseUrl: string | undefined, endpoint: string): string {
  if (!baseUrl) {
    throw new Error('Base URL is required')
  }

  // Remove trailing slash from base URL
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '')
  
  // Remove leading slash from endpoint
  const cleanEndpoint = endpoint.replace(/^\/+/, '')
  
  // Construct URL with /api prefix
  // If baseUrl already ends with /api, don't add it again
  if (cleanBaseUrl.endsWith('/api')) {
    return `${cleanBaseUrl}/${cleanEndpoint}`
  }
  
  return `${cleanBaseUrl}/api/${cleanEndpoint}`
}

