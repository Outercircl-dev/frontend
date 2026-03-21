
import { useState, useCallback } from 'react';
import { membershipService } from '@/services/membershipService';
import type { SupabaseMembership } from '@/types/membership';

export const useMembershipData = () => {
  const [membership, setMembership] = useState<SupabaseMembership | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMembership = useCallback(async (user: any) => {
    if (!user) {
      setMembership(null);
      setLoading(false);
      return;
    }

    try {
      // First check if user is an admin
      const adminMembership = await membershipService.loadAdminMembership(user.id);
      
      if (adminMembership) {
        setMembership(adminMembership);
        setLoading(false);
        return;
      }

      // If not admin, check if user is a member of any subscription
      const memberMembership = await membershipService.loadMemberMembership(user.id);
      
      if (memberMembership) {
        setMembership(memberMembership);
      }

    } catch (error) {
      console.error('Error loading membership:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    membership,
    loading,
    loadMembership,
    setMembership,
    setLoading
  };
};
