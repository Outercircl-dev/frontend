import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface DashboardData {
  profile: any;
  events: any[];
  notifications: any[];
}

export const useSimpleDashboard = (userId: string | null) => {
  return useQuery({
    queryKey: ['dashboard', userId],
    queryFn: async (): Promise<DashboardData | null> => {
      if (!userId) {
        console.log('🔍 useSimpleDashboard: No userId provided');
        return null;
      }

      console.log('📊 useSimpleDashboard: Fetching data for user:', userId);

      try {
        // Simple, direct queries without complex batching
        const [profileResult, eventsResult, notificationsResult] = await Promise.allSettled([
          supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle(), // Use maybeSingle instead of single to avoid errors
          
          supabase
            .from('events')
            .select('*')
            .eq('host_id', userId)
            .gte('date', new Date().toISOString().split('T')[0])
            .order('date', { ascending: true })
            .limit(10),
            
          supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .is('read_at', null)
            .limit(5)
        ]);

        const result = {
          profile: profileResult.status === 'fulfilled' ? profileResult.value.data : null,
          events: eventsResult.status === 'fulfilled' ? (eventsResult.value.data || []) : [],
          notifications: notificationsResult.status === 'fulfilled' ? (notificationsResult.value.data || []) : []
        };

        console.log('✅ useSimpleDashboard: Data fetched successfully', {
          hasProfile: !!result.profile,
          eventsCount: result.events.length,
          notificationsCount: result.notifications.length
        });

        return result;
      } catch (error) {
        console.error('❌ useSimpleDashboard: Error fetching data:', error);
        throw error;
      }
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      console.log('🔄 useSimpleDashboard: Retry attempt', failureCount, error);
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};