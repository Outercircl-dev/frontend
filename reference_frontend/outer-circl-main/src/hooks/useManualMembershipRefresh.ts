import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMembership } from '@/components/OptimizedProviders';

export const useManualMembershipRefresh = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { updateMembershipTier } = useMembership();

  const refreshMembership = async () => {
    setIsRefreshing(true);
    try {
      // Call the check-subscription function
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (!error && data) {
        if (data.subscribed && data.subscription_tier) {
          console.log('Manual refresh found subscription:', data.subscription_tier);
          updateMembershipTier(data.subscription_tier);
          
          // Trigger a page refresh after successful update
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          
          return true;
        }
      }
      
      console.log('Manual refresh: no active subscription found');
      return false;
    } catch (error) {
      console.error('Error during manual membership refresh:', error);
      return false;
    } finally {
      setIsRefreshing(false);
    }
  };

  return { refreshMembership, isRefreshing };
};