
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';


export type ProfileVisibility = 'public' | 'friends' | 'private';

export interface PrivacySettings {
  profile_visibility: ProfileVisibility;
  allow_friend_requests: boolean;
}

export interface FriendshipData {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  requested_by: string;
  created_at: string;
}

export const useProfilePrivacy = (userId?: string) => {
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [friendships, setFriendships] = useState<FriendshipData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let mounted = true;

    const initializeData = async () => {
      try {
        await Promise.all([
          fetchPrivacySettings(),
          fetchFriendships()
        ]);
      } catch (error) {
        console.error('Error initializing privacy data:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const fetchPrivacySettings = async () => {
      try {
        const { data, error } = await supabase
          .from('profile_privacy_settings')
          .select('profile_visibility, allow_friend_requests')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) throw error;

        if (mounted) {
          setPrivacySettings(data ? {
            profile_visibility: data.profile_visibility as ProfileVisibility,
            allow_friend_requests: data.allow_friend_requests
          } : {
            profile_visibility: 'public',
            allow_friend_requests: true
          });
        }
      } catch (error) {
        console.error('Error fetching privacy settings:', error);
        if (mounted) {
          toast.error('Failed to load privacy settings');
        }
      }
    };

    const fetchFriendships = async () => {
      try {
        const { data, error } = await supabase
          .from('friendships')
          .select('*')
          .or(`user_id.eq.${userId},friend_id.eq.${userId}`);

        if (error) throw error;
        
        if (mounted) {
          const typedData: FriendshipData[] = (data || []).map(item => ({
            id: item.id,
            user_id: item.user_id,
            friend_id: item.friend_id,
            status: item.status as 'pending' | 'accepted' | 'declined' | 'blocked',
            requested_by: item.requested_by,
            created_at: item.created_at
          }));
          
          setFriendships(typedData);
        }
      } catch (error) {
        console.error('Error fetching friendships:', error);
      }
    };

    initializeData();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const updatePrivacySettings = async (settings: Partial<PrivacySettings>) => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('profile_privacy_settings')
        .upsert({
          user_id: userId,
          ...settings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      setPrivacySettings(prev => ({ ...prev, ...settings }) as PrivacySettings);
      toast.success('Privacy settings updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      toast.error('Failed to update privacy settings');
      return false;
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from('friendships')
        .insert({
          user_id: userId,
          friend_id: friendId,
          status: 'pending',
          requested_by: userId
        });

      if (error) throw error;

      await refetchData();
      toast.success('Friend request sent');
      return true;
    } catch (error) {
      console.error('Error sending friend request:', error);
      toast.error('Failed to send friend request');
      return false;
    }
  };

  const respondToFriendRequest = async (friendshipId: string, status: 'accepted' | 'declined') => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', friendshipId);

      if (error) throw error;

      await refetchData();
      toast.success(`Friend request ${status}`);
      return true;
    } catch (error) {
      console.error('Error responding to friend request:', error);
      toast.error('Failed to respond to friend request');
      return false;
    }
  };

  const checkCanViewProfile = async (profileOwnerId: string, viewerId: string): Promise<'none' | 'limited' | 'full'> => {
    if (!profileOwnerId || !viewerId) return 'none';
    
    try {
      const { data, error } = await supabase
        .rpc('can_view_profile', {
          profile_id: profileOwnerId,
          viewing_user_id: viewerId
        });

      if (error) throw error;
      return data as 'none' | 'limited' | 'full';
    } catch (error) {
      console.error('Error checking profile view permission:', error);
      return 'none';
    }
  };

  const getFriendshipStatus = (friendId: string) => {
    const friendship = friendships.find(f => 
      (f.user_id === friendId || f.friend_id === friendId)
    );
    return friendship?.status || null;
  };

  const isFriend = (friendId: string) => {
    return getFriendshipStatus(friendId) === 'accepted';
  };

  const hasPendingRequest = (friendId: string) => {
    return getFriendshipStatus(friendId) === 'pending';
  };

  const refetchData = async () => {
    if (!userId) return;
    
    try {
      const [privacyResponse, friendshipsResponse] = await Promise.all([
        supabase
          .from('profile_privacy_settings')
          .select('profile_visibility, allow_friend_requests')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('friendships')
          .select('*')
          .or(`user_id.eq.${userId},friend_id.eq.${userId}`)
      ]);

      if (privacyResponse.data) {
        setPrivacySettings({
          profile_visibility: privacyResponse.data.profile_visibility as ProfileVisibility,
          allow_friend_requests: privacyResponse.data.allow_friend_requests
        });
      }

      if (friendshipsResponse.data) {
        const typedData: FriendshipData[] = friendshipsResponse.data.map(item => ({
          id: item.id,
          user_id: item.user_id,
          friend_id: item.friend_id,
          status: item.status as 'pending' | 'accepted' | 'declined' | 'blocked',
          requested_by: item.requested_by,
          created_at: item.created_at
        }));
        
        setFriendships(typedData);
      }
    } catch (error) {
      console.error('Error refetching data:', error);
    }
  };

  return {
    privacySettings,
    friendships,
    loading,
    updatePrivacySettings,
    sendFriendRequest,
    respondToFriendRequest,
    checkCanViewProfile,
    getFriendshipStatus,
    isFriend,
    hasPendingRequest,
    refetch: refetchData
  };
};
