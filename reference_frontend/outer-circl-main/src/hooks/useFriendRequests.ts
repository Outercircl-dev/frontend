import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useFriendRequests = () => {
  const [isLoading, setIsLoading] = useState(false);

  const sendFriendRequest = async (friendId: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('send_friend_request', {
        friend_id: friendId
      });

      if (error) throw error;

      toast.success('Friend request sent!');
      return true;
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      toast.error(error.message || 'Failed to send friend request');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const respondToFriendRequest = async (friendshipId: string, response: 'accepted' | 'declined'): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('respond_to_friend_request', {
        friendship_id: friendshipId,
        response: response
      });

      if (error) throw error;

      const message = response === 'accepted' ? 'Friend request accepted!' : 'Friend request declined';
      toast.success(message);
      return true;
    } catch (error: any) {
      console.error('Error responding to friend request:', error);
      toast.error(error.message || 'Failed to respond to friend request');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendFriendRequest,
    respondToFriendRequest,
    isLoading
  };
};