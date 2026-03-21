import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Friend {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  status: 'online' | 'offline';
  lastActivity?: string;
  mutualFriendsCount?: number;
}

export const useFriends = (userId?: string) => {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    fetchFriends();
  }, [userId]);

  const fetchFriends = async () => {
    if (!userId) return;

    try {
      // Use the database function for better performance and reliability
      const { data: friendsData, error } = await supabase
        .rpc('get_user_friends', { p_user_id: userId });

      if (error) {
        console.error('Error calling get_user_friends:', error);
        throw error;
      }

      const friendProfiles: Friend[] = (friendsData || []).map((friend: any) => ({
        id: friend.id,
        name: friend.name || 'Unknown',
        username: friend.username || 'unknown',
        avatar_url: friend.avatar_url,
        status: 'offline' as const,
        lastActivity: 'Recently active'
      }));

      setFriends(friendProfiles);
    } catch (error) {
      console.error('Error fetching friends:', error);
      setFriends([]);
    } finally {
      setLoading(false);
    }
  };

  const getFriendsCount = () => friends.length;

  const isFriend = (friendId: string) => {
    return friends.some(friend => friend.id === friendId);
  };

  return {
    friends,
    loading,
    friendsCount: getFriendsCount(),
    isFriend,
    refetch: fetchFriends
  };
};