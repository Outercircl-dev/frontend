import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { validateInput, ClientRateLimit } from '@/utils/security';

interface SessionSecurityOptions {
  sessionTimeoutMs?: number;
  maxConcurrentSessions?: number;
  requireReauth?: boolean;
}

export const useSessionSecurity = (options: SessionSecurityOptions = {}) => {
  const {
    sessionTimeoutMs = 24 * 60 * 60 * 1000, // 24 hours
    maxConcurrentSessions = 5,
    requireReauth = false
  } = options;

  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isSessionValid, setIsSessionValid] = useState(true);
  const [authAttempts] = useState(() => new ClientRateLimit());

  // Track user activity to prevent session timeout
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // Check session validity
  const checkSessionValidity = useCallback(async () => {
    const now = Date.now();
    
    // Check session timeout
    if (now - lastActivity > sessionTimeoutMs) {
      setIsSessionValid(false);
      await supabase.auth.signOut();
      return false;
    }

    // Verify session with server
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        setIsSessionValid(false);
        return false;
      }
      
      setIsSessionValid(true);
      return true;
    } catch (error) {
      setIsSessionValid(false);
      return false;
    }
  }, [lastActivity, sessionTimeoutMs]);

  // Secure login with rate limiting
  const secureLogin = useCallback(async (
    email: string, 
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    const loginKey = `login_${email}`;
    
    // Check rate limiting
    if (authAttempts.isRateLimited(loginKey, 5, 15 * 60 * 1000)) {
      return {
        success: false,
        error: 'Too many login attempts. Please try again in 15 minutes.'
      };
    }

    // Validate input
    if (!validateInput.isValidEmail(email)) {
      return {
        success: false,
        error: 'Invalid email format'
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password
      });

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      // Reset rate limit on successful login
      authAttempts.resetLimit(loginKey);
      updateActivity();
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: 'Login failed. Please try again.'
      };
    }
  }, [authAttempts, updateActivity]);

  // Enhanced logout with cleanup
  const secureLogout = useCallback(async () => {
    try {
      // Clear local storage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('oc_')) {
          localStorage.removeItem(key);
        }
      });

      // Clear session storage
      sessionStorage.clear();

      // Sign out from Supabase
      await supabase.auth.signOut();
      
      setIsSessionValid(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  // Set up activity monitoring
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const handleActivity = () => updateActivity();
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [updateActivity]);

  // Periodic session validation
  useEffect(() => {
    const interval = setInterval(checkSessionValidity, 5 * 60 * 1000); // Every 5 minutes
    return () => clearInterval(interval);
  }, [checkSessionValidity]);

  return {
    isSessionValid,
    lastActivity,
    secureLogin,
    secureLogout,
    checkSessionValidity,
    updateActivity,
    sessionTimeoutMs
  };
};