import { useState, useEffect } from 'react';
import { useMembership } from '@/components/OptimizedProviders';
import { supabase } from '@/integrations/supabase/client';

interface RecurringActivityLimits {
  recurringEventsThisMonth: number;
  monthlyRecurringLimit: number;
  canCreateRecurring: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useRecurringActivityLimits = (): RecurringActivityLimits => {
  const [recurringEventsThisMonth, setRecurringEventsThisMonth] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Wrap useMembership in try-catch to handle context errors
  let membershipTier: 'standard' | 'premium' = 'standard';
  try {
    const membershipContext = useMembership();
    membershipTier = membershipContext.membershipTier;
  } catch (contextError) {
    console.warn('MembershipContext error in useRecurringActivityLimits:', contextError);
    setError('Unable to load membership information');
  }

  const isPremium = membershipTier === 'premium';
  const monthlyRecurringLimit = isPremium ? Infinity : 2;

  useEffect(() => {
    const fetchRecurringActivityLimits = async () => {
      try {
        setError(null);
        setIsLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        // Get the current month start and end
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

        // Count recurring events for the current month
        const { data: recurringEvents, error } = await supabase
          .from('events')
          .select('id, recurring_type')
          .eq('host_id', user.id)
          .eq('is_recurring', true)
          .gte('created_at', monthStart)
          .lt('created_at', monthEnd);

        if (error) {
          console.error('Error fetching recurring events:', error);
          setError('Failed to load recurring activity limits');
          setIsLoading(false);
          return;
        }

        setRecurringEventsThisMonth(recurringEvents?.length || 0);
      } catch (error) {
        console.error('Error in fetchRecurringActivityLimits:', error);
        setError('An unexpected error occurred');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecurringActivityLimits();
  }, [membershipTier]);

  const canCreateRecurring = isPremium || recurringEventsThisMonth < monthlyRecurringLimit;

  return {
    recurringEventsThisMonth,
    monthlyRecurringLimit,
    canCreateRecurring,
    isLoading,
    error
  };
};

// Note: Recording new recurring events is now handled by the database trigger
// This function is kept for backward compatibility but does nothing
export const recordNewRecurringEvent = () => {
  // Database trigger now handles the limit enforcement automatically
  console.log('Recurring event will be tracked by database trigger');
};