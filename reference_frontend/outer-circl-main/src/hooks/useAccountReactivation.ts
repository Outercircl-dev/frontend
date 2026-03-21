import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useAccountReactivation = () => {
  const { toast } = useToast();

  useEffect(() => {
    const checkDeactivatedAccount = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        // Check if the user's account is deactivated
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('account_status, deactivated_at')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking account status:', error);
          return;
        }

        if (profile?.account_status === 'deactivated') {
          // Account is deactivated - sign them out and show error
          await supabase.auth.signOut();
          
          toast({
            title: "Account Deactivated",
            description: "This account has been permanently deactivated and cannot be accessed.",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error('Error in account deactivation check:', error);
      }
    };

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        checkDeactivatedAccount();
      }
    });

    // Check on initial load if user is already signed in
    checkDeactivatedAccount();

    return () => subscription.unsubscribe();
  }, [toast]);
};