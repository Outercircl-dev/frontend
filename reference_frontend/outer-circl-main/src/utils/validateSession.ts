import type { Session } from '@supabase/supabase-js';

/**
 * Validates if a Supabase session is truly valid and not expired
 * Checks both expiry timestamp and token structure
 */
export const isSessionValid = (session: Session | null): boolean => {
  if (!session) return false;
  
  // Check if session has required properties
  if (!session.access_token || !session.user || !session.expires_at) {
    console.warn('⚠️ Session missing required properties');
    return false;
  }
  
  // Check if session has expired (expires_at is in seconds, Date.now() is in ms)
  const currentTimestamp = Math.floor(Date.now() / 1000);
  if (session.expires_at <= currentTimestamp) {
    console.warn('⚠️ Session has expired', {
      expiresAt: new Date(session.expires_at * 1000).toISOString(),
      now: new Date(currentTimestamp * 1000).toISOString()
    });
    return false;
  }
  
  // MOBILE FIX: Very relaxed buffer (5 seconds) to accept "almost expired" sessions
  // This prevents unnecessary re-auth on slow mobile networks
  if (session.expires_at - currentTimestamp < 5) {
    console.warn('⚠️ Session expires in less than 5 seconds');
    return false;
  }
  
  return true;
};

/**
 * Validates cached session data structure and expiry
 */
export const validateCachedSession = (cachedData: any): Session | null => {
  if (!cachedData || typeof cachedData !== 'object') {
    return null;
  }
  
  // Basic structure validation
  if (!cachedData.access_token || !cachedData.user || !cachedData.expires_at) {
    console.warn('⚠️ Cached session has invalid structure');
    return null;
  }
  
  // Validate expiry
  if (!isSessionValid(cachedData as Session)) {
    return null;
  }
  
  return cachedData as Session;
};
