
import { useState, useEffect } from 'react';
import { useMembership } from '@/components/OptimizedProviders';
import { supabase } from '@/integrations/supabase/client';

interface HostingLimits {
  eventsThisMonth: number;
  monthlyLimit: number;
  canHostMore: boolean;
  isLoading: boolean;
}

export const useEventHostingLimits = (): HostingLimits => {
  const { membershipTier } = useMembership();
  const [eventsThisMonth, setEventsThisMonth] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const isPremium = membershipTier === 'premium';
  const monthlyLimit = isPremium ? Infinity : 2; // Standard users can host 2 activities per month

  useEffect(() => {
    const fetchEventCount = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        // Count events created this month by the user
        const { data: events, error } = await supabase
          .from('events')
          .select('id')
          .eq('host_id', user.id)
          .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString());

        if (error) {
          console.error('Error fetching events:', error);
          setEventsThisMonth(0);
        } else {
          setEventsThisMonth(events?.length || 0);
        }
      } catch (error) {
        console.error('Error in fetchEventCount:', error);
        setEventsThisMonth(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventCount();
  }, [membershipTier]);

  const canHostMore = isPremium || eventsThisMonth < monthlyLimit;

  return {
    eventsThisMonth,
    monthlyLimit,
    canHostMore,
    isLoading
  };
};

// recordNewEvent is no longer needed as events are tracked directly in the database
export const recordNewEvent = () => {
  // This function is deprecated - events are now tracked automatically in the database
  // when created through the events table
};
