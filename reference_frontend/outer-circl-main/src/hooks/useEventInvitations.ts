import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';


interface EventInvitation {
  id: string;
  event_id: string;
  inviter_id: string;
  invited_user_id: string;
  status: 'pending' | 'accepted' | 'declined';
  invited_at: string;
  responded_at?: string;
  event?: {
    title: string;
    description?: string;
    date?: string;
    time?: string;
    location?: string;
    category?: string;
    max_attendees?: number;
    image_url?: string;
  };
  inviter?: {
    name?: string;
    username?: string;
    avatar_url?: string;
  };
}

export const useEventInvitations = () => {

  const [invitations, setInvitations] = useState<EventInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInvitations = async () => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) return;

      const { data, error } = await supabase
        .from('event_invitations')
        .select(`
          *,
          event:events(
            title,
            description,
            date,
            time,
            location,
            category,
            max_attendees,
            image_url
          ),
          inviter:profiles!event_invitations_inviter_id_fkey(
            name,
            username,
            avatar_url
          )
        `)
        .eq('invited_user_id', currentUser.user.id)
        .eq('status', 'pending')
        .order('invited_at', { ascending: false });

      if (error) {
        console.error('Error fetching invitations:', error);
        return;
      }

      setInvitations(data as EventInvitation[] || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendInvitations = async (eventId: string, friendIds: string[]) => {
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        toast.error('You must be logged in to send invitations');
        return false;
      }

      // Check if user is premium
      const { data: profile } = await supabase
        .from('profiles')
        .select('membership_tier')
        .eq('id', currentUser.user.id)
        .single();

      if (profile?.membership_tier !== 'premium') {
        toast.error('Only premium members can invite friends to activities');
        return false;
      }

      const invitations = friendIds.map(friendId => ({
        event_id: eventId,
        inviter_id: currentUser.user.id,
        invited_user_id: friendId
      }));

      const { error } = await supabase
        .from('event_invitations')
        .insert(invitations);

      if (error) {
        console.error('Error sending invitations:', error);
        toast.error('Failed to send some invitations');
        return false;
      }

      toast.success(`Sent ${friendIds.length} invitation${friendIds.length > 1 ? 's' : ''}`);
      return true;
    } catch (error) {
      console.error('Error sending invitations:', error);
      toast.error('Failed to send invitations');
      return false;
    }
  };

  const respondToInvitation = async (invitationId: string, accept: boolean) => {
    try {
      if (accept) {
        const { data, error } = await supabase.rpc('accept_event_invitation', {
          p_invitation_id: invitationId
        });

        if (error) {
          console.error('Error accepting invitation:', error);
          toast.error('Failed to accept invitation');
          return false;
        }

        if (data) {
          toast.success('Invitation accepted!');
          await fetchInvitations(); // Refresh invitations
          return true;
        } else {
          toast.error('Unable to accept invitation');
          return false;
        }
      } else {
        const { error } = await supabase
          .from('event_invitations')
          .update({ 
            status: 'declined', 
            responded_at: new Date().toISOString() 
          })
          .eq('id', invitationId);

        if (error) {
          console.error('Error declining invitation:', error);
          toast.error('Failed to decline invitation');
          return false;
        }

        toast.success('Invitation declined');
        await fetchInvitations(); // Refresh invitations
        return true;
      }
    } catch (error) {
      console.error('Error responding to invitation:', error);
      toast.error('Failed to respond to invitation');
      return false;
    }
  };

  useEffect(() => {
    let mounted = true;
    let channel: any;
    
    if (mounted) {
      fetchInvitations();

      // Subscribe to invitation changes with unique channel name
      channel = supabase
        .channel(`event-invitations-${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'event_invitations'
          },
          () => {
            if (mounted) {
              fetchInvitations();
            }
          }
        )
        .subscribe();
    }

    return () => {
      mounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return {
    invitations,
    isLoading,
    sendInvitations,
    respondToInvitation,
    refetch: fetchInvitations
  };
};