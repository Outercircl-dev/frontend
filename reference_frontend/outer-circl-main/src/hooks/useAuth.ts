/**
 * useAuth - Simplified Auth Hook
 * Phase 1: Core architectural fix
 * 
 * Simple hook to access authentication state
 * Guaranteed to be ready when called (AppBootstrap ensures this)
 */

import { useAuthContext } from '@/components/core/AuthProvider';

export const useAuth = () => {
  return useAuthContext();
};
