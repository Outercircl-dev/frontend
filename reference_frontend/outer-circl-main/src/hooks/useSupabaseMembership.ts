
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMembershipData } from './useMembershipData';
import { useMembershipActions } from './useMembershipActions';

export const useSupabaseMembership = () => {
  const [user, setUser] = useState<any>(null);
  const { membership, loading, loadMembership } = useMembershipData();

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        loadMembership(user);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        loadMembership(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadMembership]);

  const reload = () => loadMembership(user);
  const { sendInvitation, removeSlot } = useMembershipActions({ membership, loadMembership: reload });

  const isAdmin = membership?.admin_user_id === user?.id;
  const availableSlots = membership?.membership_slots?.filter(slot => slot.status === 'available').length || 0;
  const usedSlots = membership?.membership_slots?.filter(slot => slot.user_id).length || 0;

  return {
    membership,
    loading,
    isAdmin,
    availableSlots,
    usedSlots,
    sendInvitation,
    removeSlot,
    reload
  };
};
