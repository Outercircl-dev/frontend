'use client';

import { useCallback, useEffect, useState } from 'react';
import { UserAuthState, UserAuthStateType } from '@/lib/auth-state-machine';

interface AuthUser {
  id: string;
  email: string;
  supabaseUserId: string;
}

interface AuthProfile {
  emailVerified: boolean;
  profileCompleted: boolean;
}

interface AuthData {
  state: UserAuthState;
  redirectUrl: string;
  user: AuthUser;
  profile?: AuthProfile;
}

interface UseAuthStateReturn {
  state: UserAuthStateType;
  redirectUrl: string | null;
  user: AuthUser | null;
  profile: AuthProfile | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to fetch and track user auth state from backend
 *
 * Usage:
 * const { state, redirectUrl, isLoading } = useAuthState();
 *
 * Returns:
 * - state: 'needs-email-verification' | 'needs-profile' | 'active' | null
 * - redirectUrl: where user should go
 * - user: user data
 * - profile: profile flags
 * - isLoading: true while fetching
 * - error: error if any
 */
export function useAuthState(): UseAuthStateReturn {
  const [state, setState] = useState<UserAuthStateType>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAuthState = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/v1/auth/me', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          setState(null);
          setRedirectUrl('/auth/login');
          setUser(null);
          setProfile(null);
          return;
        }
        throw new Error('Failed to fetch auth state');
      }

      const data: AuthData = await response.json();
      setState(data.state);
      setRedirectUrl(data.redirectUrl);
      setUser(data.user);
      setProfile(data.profile ?? null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setState(null);
      setRedirectUrl('/auth/login');
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuthState();
  }, [fetchAuthState]);

  return {
    state,
    redirectUrl,
    user,
    profile,
    isLoading,
    error,
  };
}

