
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { SupabaseMembership } from '@/types/membership';

export const membershipService = {
  async loadAdminMembership(userId: string): Promise<SupabaseMembership | null> {
    const { data: adminMembership } = await supabase
      .from('membership_subscriptions')
      .select(`
        *,
        membership_slots (
          id,
          user_id,
          slot_position,
          status,
          profiles (
            name,
            email
          )
        )
      `)
      .eq('admin_user_id', userId)
      .single();

    if (adminMembership) {
      return {
        ...adminMembership,
        subscription_tier: adminMembership.subscription_tier as 'premium',
        membership_slots: (adminMembership.membership_slots || []).map((slot: any) => ({
          ...slot,
          status: slot.status as 'available' | 'invited' | 'active'
        }))
      };
    }

    return null;
  },

  async loadMemberMembership(userId: string): Promise<SupabaseMembership | null> {
    const { data: memberSlot } = await supabase
      .from('membership_slots')
      .select(`
        id,
        user_id,
        slot_position,
        status,
        subscription_id,
        membership_subscriptions (
          id,
          subscription_tier,
          admin_user_id,
          status,
          membership_slots (
            id,
            user_id,
            slot_position,
            status,
            profiles (
              name,
              email
            )
          )
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (memberSlot?.membership_subscriptions) {
      return {
        ...memberSlot.membership_subscriptions,
        subscription_tier: memberSlot.membership_subscriptions.subscription_tier as 'premium',
        membership_slots: (memberSlot.membership_subscriptions.membership_slots || []).map((slot: any) => ({
          ...slot,
          status: slot.status as 'available' | 'invited' | 'active'
        }))
      };
    }

    return null;
  },

  async sendInvitation(email: string, subscriptionId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('send-invitation', {
        body: {
          email,
          subscriptionId
        }
      });

      if (error) {
        toast.error(`Failed to send invitation: ${error.message}`);
        return false;
      }

      if (data.error) {
        toast.error(data.error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error sending invitation:', error);
      toast.error('Failed to send invitation');
      return false;
    }
  },

  async removeSlot(slotId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('membership_slots')
        .update({ 
          user_id: null, 
          status: 'available' 
        })
        .eq('id', slotId);

      if (error) {
        toast.error('Failed to remove slot');
        return false;
      }

      toast.success('Account slot removed');
      return true;
    } catch (error) {
      console.error('Error removing slot:', error);
      toast.error('Failed to remove slot');
      return false;
    }
  }
};
