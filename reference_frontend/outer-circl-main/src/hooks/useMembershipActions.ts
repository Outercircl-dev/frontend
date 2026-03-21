
import { useCallback } from 'react';
import { membershipService } from '@/services/membershipService';
import type { SupabaseMembership } from '@/types/membership';

interface UseMembershipActionsProps {
  membership: SupabaseMembership | null;
  loadMembership: () => Promise<void>;
}

export const useMembershipActions = ({ membership, loadMembership }: UseMembershipActionsProps) => {
  const sendInvitation = useCallback(async (email: string): Promise<boolean> => {
    if (!membership) {
      return false;
    }

    const success = await membershipService.sendInvitation(email, membership.id);
    
    if (success) {
      // Reload membership to get updated slots
      await loadMembership();
    }
    
    return success;
  }, [membership, loadMembership]);

  const removeSlot = useCallback(async (slotId: string) => {
    const success = await membershipService.removeSlot(slotId);
    
    if (success) {
      // Reload membership
      await loadMembership();
    }
  }, [loadMembership]);

  return {
    sendInvitation,
    removeSlot
  };
};
