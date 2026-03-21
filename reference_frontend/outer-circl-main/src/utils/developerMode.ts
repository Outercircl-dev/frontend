/**
 * Utility functions for developer mode and admin access control
 */

/**
 * Check if the application is in developer mode
 * Returns true if:
 * - Running in development environment, OR
 * - User has admin role (passed as parameter)
 */
export const isDeveloperMode = (isAdmin: boolean = false): boolean => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' ||
     window.location.hostname.includes('lovable.app'));
  
  return isDevelopment || isLocalhost || isAdmin;
};

/**
 * Check if debug features should be enabled
 * More restrictive than general developer mode
 */
export const shouldShowDebugFeatures = (isAdmin: boolean = false): boolean => {
  return isDeveloperMode(isAdmin);
};

/**
 * Check if admin-only features should be visible
 */
export const shouldShowAdminFeatures = (isAdmin: boolean = false): boolean => {
  return isAdmin;
};