import { useEffect } from 'react';
import { useMembership } from '@/components/OptimizedProviders';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to keep membership status synchronized with Stripe
 * This automatically checks subscription status when the user returns to the app
 */
export const useMembershipSync = () => {
  const { updateMembershipTier, membershipTier } = useMembership();

  useEffect(() => {
    let mounted = true;

    const syncMembership = async (currentUser?: any) => {
      try {
        // Use provided user or get current session
        let user = currentUser;
        if (!user) {
          const { data: { session } } = await supabase.auth.getSession();
          user = session?.user;
        }
        
        if (!user || !mounted) return;

        // Check Stripe subscription status with timeout for mobile
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 8000);
        });

        const requestPromise = supabase.functions.invoke('check-subscription');
        
        const { data, error } = await Promise.race([requestPromise, timeoutPromise]) as any;
        
        if (mounted && !error && data) {
          if (data.subscribed && data.subscription_tier) {
            // Update to the tier confirmed by Stripe
            const stripeTier = data.subscription_tier;
            if (membershipTier !== stripeTier) {
              console.log(`Syncing membership: ${membershipTier} -> ${stripeTier}`);
              updateMembershipTier(stripeTier);
              
              // No page reload - let React handle the state updates
              // Force UI refresh with custom event instead
              setTimeout(() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('membershipSynced', { detail: { tier: stripeTier } }));
                }
              }, 100);
            }
          } else if (membershipTier === 'premium') {
            // User lost premium access, downgrade to standard
            console.log('Premium subscription no longer active, downgrading to standard');
            updateMembershipTier('standard');
          }
        }
      } catch (error) {
        console.log('Membership sync failed:', error);
        // On mobile, don't let this block the app
      }
    };

    // Delay initial sync to prevent blocking page load
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const initialDelay = isMobile ? 3000 : 1000; // 3 seconds on mobile, 1 second on desktop
    
    const initialSyncTimeout = setTimeout(() => {
      if (mounted) {
        syncMembership();
      }
    }, initialDelay);

    // Sync when the user returns to the app (visibility change)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('App became visible, syncing membership...');
        syncMembership();
      }
    };

    // Sync when window gains focus
    const handleFocus = () => {
      console.log('Window gained focus, syncing membership...');
      syncMembership();
    };

    // Listen for custom membership update events
    const handleMembershipUpdate = () => {
      console.log('Custom membership update event received');
      syncMembership();
    };

    // Set up auth state listener for better session handling
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('User signed in, syncing membership...');
        syncMembership(session.user);
      }
    });

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('membershipUpdate', handleMembershipUpdate);

    // Periodic sync every 30 seconds (only when tab is active)
    const intervalId = setInterval(() => {
      if (!document.hidden) {
        syncMembership();
      }
    }, 30000);

    return () => {
      mounted = false;
      clearTimeout(initialSyncTimeout);
      authSubscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('membershipUpdate', handleMembershipUpdate);
      clearInterval(intervalId);
    };
  }, [updateMembershipTier, membershipTier]);

  // Return a manual sync function for components that need it
  const manualSync = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return false;

      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (!error && data?.subscribed && data?.subscription_tier) {
        updateMembershipTier(data.subscription_tier);
        return true;
      }
      return false;
    } catch (error) {
      console.log('Manual membership sync failed:', error);
      return false;
    }
  };

  return { manualSync };
};