import { useState, useEffect } from 'react';
import { useAppContext } from '@/components/optimization/UltraMinimalProviders';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'admin' | 'moderator' | 'user' | null;

interface UseUserRoleReturn {
  role: UserRole;
  isAdmin: boolean;
  isModerator: boolean;
  loading: boolean;
  error: string | null;
}

/**
 * Hook to fetch and manage user roles from the database
 * Queries the user_roles table and caches the result
 */
export const useUserRole = (): UseUserRoleReturn => {
  const { user } = useAppContext();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (roleError) {
          console.error('Error fetching user role:', roleError);
          setError('Failed to fetch user role');
          setRole('user'); // Default to 'user' on error
        } else if (data) {
          setRole(data.role as UserRole);
        } else {
          // No role found - default to 'user'
          setRole('user');
        }
      } catch (err) {
        console.error('Unexpected error fetching role:', err);
        setError('Failed to fetch user role');
        setRole('user'); // Fail closed
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [user?.id]);

  return {
    role,
    isAdmin: role === 'admin',
    isModerator: role === 'moderator',
    loading,
    error
  };
};