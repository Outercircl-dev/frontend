import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UsernameValidation {
  isValid: boolean;
  isChecking: boolean;
  error: string | null;
  suggestions: string[];
}

export const useUsernameValidation = (username: string, debounceMs: number = 500) => {
  const [validation, setValidation] = useState<UsernameValidation>({
    isValid: false,
    isChecking: false,
    error: null,
    suggestions: []
  });

  const checkUsername = useCallback(async (usernameToCheck: string) => {
    if (!usernameToCheck.trim()) {
      setValidation({
        isValid: false,
        isChecking: false,
        error: 'Username is required',
        suggestions: []
      });
      return;
    }

    // Basic format validation
    if (usernameToCheck.length < 3 || usernameToCheck.length > 30) {
      setValidation({
        isValid: false,
        isChecking: false,
        error: 'Username must be between 3 and 30 characters',
        suggestions: []
      });
      return;
    }

    if (!/^[a-zA-Z0-9_]+$/.test(usernameToCheck)) {
      setValidation({
        isValid: false,
        isChecking: false,
        error: 'Username can only contain letters, numbers, and underscores',
        suggestions: []
      });
      return;
    }

    setValidation(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      // Check if username is available
      const { data, error } = await supabase.rpc('is_username_unique', {
        new_username: usernameToCheck
      });

      if (error) {
        console.error('Error checking username:', error);
        setValidation({
          isValid: false,
          isChecking: false,
          error: 'Error checking username availability',
          suggestions: []
        });
        return;
      }

      if (data) {
        setValidation({
          isValid: true,
          isChecking: false,
          error: null,
          suggestions: []
        });
      } else {
        // Get suggestions if username is taken
        const { data: suggestionsData, error: suggestionsError } = await supabase.rpc('suggest_unique_username', {
          base_username: usernameToCheck
        });

        setValidation({
          isValid: false,
          isChecking: false,
          error: 'Username is already taken',
          suggestions: suggestionsError ? [] : (suggestionsData || [])
        });
      }
    } catch (error) {
      console.error('Username validation error:', error);
      setValidation({
        isValid: false,
        isChecking: false,
        error: 'Error checking username availability',
        suggestions: []
      });
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (username.trim()) {
        checkUsername(username);
      } else {
        setValidation({
          isValid: false,
          isChecking: false,
          error: 'Username is required',
          suggestions: []
        });
      }
    }, debounceMs);

    return () => clearTimeout(timeoutId);
  }, [username, debounceMs, checkUsername]);

  return validation;
};