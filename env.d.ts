/**
 * Environment variable type declarations
 * 
 * Note: API_URL is a server-only environment variable (no NEXT_PUBLIC_ prefix)
 * to prevent exposing the backend URL in client-side bundles.
 * 
 * NEXT_PUBLIC_API_URL is used only in client-side code and API routes that need
 * to be accessible from the browser.
 */
declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * Backend API base URL (server-only, no trailing /api)
     * Example: https://backend.example.com
     * 
     * Used in server actions to call backend endpoints.
     * Endpoints are constructed as: ${API_URL}/api/{endpoint}
     */
    API_URL?: string

    /**
     * Backend API base URL (client-accessible, no trailing /api)
     * Example: https://backend.example.com
     * 
     * Used in API routes and client-side code.
     * Endpoints are constructed as: ${NEXT_PUBLIC_API_URL}/api/{endpoint}
     */
    NEXT_PUBLIC_API_URL?: string
  }
}

