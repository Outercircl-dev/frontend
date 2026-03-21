import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type FriendshipStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted';

interface FriendshipData {
  id?: string;
  status: FriendshipStatus;
  requested_by?: string;
}

export const useFriendshipActions = (currentUserId?: string, targetUserId?: string) => {
  const [friendshipStatus, setFriendshipStatus] = useState<FriendshipStatus>('none');
  const [loading, setLoading] = useState(false);
  const [friendshipId, setFriendshipId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
      return;
    }
    
    fetchFriendshipStatus();
  }, [currentUserId, targetUserId]);

  const fetchFriendshipStatus = async () => {
    if (!currentUserId || !targetUserId) return;

    try {
      const { data: friendship, error } = await supabase
        .from('friendships')
        .select('id, status, requested_by, user_id, friend_id')
        .or(`and(user_id.eq.${currentUserId},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${currentUserId})`)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching friendship status:', error);
        return;
      }

      if (!friendship) {
        setFriendshipStatus('none');
        setFriendshipId(null);
      } else {
        setFriendshipId(friendship.id);
        
        if (friendship.status === 'accepted') {
          setFriendshipStatus('accepted');
        } else if (friendship.status === 'pending') {
          if (friendship.requested_by === currentUserId) {
            setFriendshipStatus('pending_sent');
          } else {
            setFriendshipStatus('pending_received');
          }
        } else {
          setFriendshipStatus('none');
        }
      }
    } catch (error) {
      console.error('Error fetching friendship status:', error);
    }
  };

  const sendFriendRequest = async () => {
    if (!currentUserId || !targetUserId || loading) return;

    setLoading(true);
    try {
      let friendshipData: any;
      
      // First check if there's already a friendship record (including deleted ones)
      const { data: existingFriendship, error: checkError } = await supabase
        .from('friendships')
        .select('id, status')
        .or(`and(user_id.eq.${currentUserId},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${currentUserId})`)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingFriendship) {
        // If friendship exists, update it instead of creating new one
        const { data, error } = await supabase
          .from('friendships')
          .update({
            status: 'pending',
            requested_by: currentUserId,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingFriendship.id)
          .select()
          .single();

        if (error) throw error;
        friendshipData = data;
        setFriendshipId(data.id);
      } else {
        // Create new friendship record
        const { data, error } = await supabase
          .from('friendships')
          .insert({
            user_id: currentUserId,
            friend_id: targetUserId,
            requested_by: currentUserId,
            status: 'pending'
          })
          .select()
          .single();

        if (error) throw error;
        friendshipData = data;
        setFriendshipId(data.id);
      }

      setFriendshipStatus('pending_sent');
      
      // Create notification for the target user
      try {
        await supabase
          .from('notifications')
          .insert({
            user_id: targetUserId,
            title: 'New Friend Request',
            content: `You have a new friend request`,
            notification_type: 'friend_request',
            metadata: {
              friendship_id: friendshipData.id,
              sender_id: currentUserId,
              sender_name: 'Someone' // This could be fetched from profile
            }
          });
      } catch (notificationError) {
        console.error('Error creating friend request notification:', notificationError);
        // Don't fail the main action if notification fails
      }
      
      toast.success('Friend request sent!');
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast.error('Failed to send friend request');
    } finally {
      setLoading(false);
    }
  };

  const acceptFriendRequest = async () => {
    if (!friendshipId || loading) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) throw error;

      setFriendshipStatus('accepted');
      toast.success('Friend request accepted!');
    } catch (error) {
      console.error('Error accepting friend request:', error);
      toast.error('Failed to accept friend request');
    } finally {
      setLoading(false);
    }
  };

  const declineFriendRequest = async () => {
    if (!friendshipId || loading) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      setFriendshipId(null);
      setFriendshipStatus('none');
      toast.success('Friend request declined');
    } catch (error) {
      console.error('Error declining friend request:', error);
      toast.error('Failed to decline friend request');
    } finally {
      setLoading(false);
    }
  };

  const removeFriend = async () => {
    if (!friendshipId || loading) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      setFriendshipId(null);
      setFriendshipStatus('none');
      toast.success('Friend removed');
    } catch (error) {
      console.error('Error removing friend:', error);
      toast.error('Failed to remove friend');
    } finally {
      setLoading(false);
    }
  };

  const cancelFriendRequest = async () => {
    if (!friendshipId || loading) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', friendshipId);

      if (error) throw error;

      setFriendshipId(null);
      setFriendshipStatus('none');
      toast.success('Friend request cancelled');
    } catch (error) {
      console.error('Error cancelling friend request:', error);
      toast.error('Failed to cancel friend request');
    } finally {
      setLoading(false);
    }
  };

  return {
    friendshipStatus,
    loading,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    cancelFriendRequest,
    refetch: fetchFriendshipStatus
  };
};