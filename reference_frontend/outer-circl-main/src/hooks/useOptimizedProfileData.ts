import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { getUserMedia } from '@/utils/mediaStorage';
import { useProfilePrivacy } from '@/hooks/useProfilePrivacy';

interface ProfileData {
  profile: any;
  userEvents: any[];
  savedActivities: any[];
  pastActivities: any[];
  userMedia: any[];
  friends: any[];
  error: string | null;
  loading: {
    initial: boolean;
    profile: boolean;
    events: boolean;
    activities: boolean;
    media: boolean;
    friends: boolean;
  };
}

export const useOptimizedProfileData = (
  targetUserId: string | null,
  currentUser: User | null,
  isCurrentUserProfile: boolean
) => {
  const [data, setData] = useState<ProfileData>({
    profile: null,
    userEvents: [],
    savedActivities: [],
    pastActivities: [],
    userMedia: [],
    friends: [],
    error: null,
    loading: {
      initial: true,
      profile: true,
      events: true,
      activities: true,
      media: true,
      friends: true,
    }
  });

  const { checkCanViewProfile } = useProfilePrivacy(currentUser?.id);

  const updateLoading = useCallback((key: keyof ProfileData['loading'], value: boolean) => {
    setData(prev => ({
      ...prev,
      loading: {
        ...prev.loading,
        [key]: value
      }
    }));
  }, []);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      return profile;
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  }, []);

  const fetchUserEvents = useCallback(async (userId: string) => {
    try {
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .eq('host_id', userId)
        .eq('status', 'active')
        .order('date', { ascending: false });

      if (error) throw error;
      return events || [];
    } catch (error) {
      console.error('Error fetching user events:', error);
      return [];
    }
  }, []);

  const fetchSavedActivities = useCallback(async (userId: string) => {
    try {
      // Parallel fetch of saved events and attending events
      const [savedEventsResponse, participantEventsResponse] = await Promise.all([
        supabase
          .from('saved_events')
          .select('id, events(*)')
          .eq('user_id', userId),
        supabase
          .from('event_participants')
          .select('status, events(*)')
          .eq('user_id', userId)
          .eq('status', 'attending')
      ]);

      if (savedEventsResponse.error) {
        console.error('Error fetching saved events:', savedEventsResponse.error);
      }
      if (participantEventsResponse.error) {
        console.error('Error fetching participant events:', participantEventsResponse.error);
      }

      // Process saved events
      const savedEvents = (savedEventsResponse.data || [])
        .map((se: any) => se.events)
        .filter((event: any) => event !== null);

      // Process future attending events
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const futureAttendingEvents = (participantEventsResponse.data || [])
        .map((p: any) => p.events)
        .filter((event: any) => {
          if (!event?.date) return false;
          const eventDate = new Date(event.date);
          return eventDate >= today;
        });

      // Combine and remove duplicates
      const allEvents = [...savedEvents];
      futureAttendingEvents.forEach((event: any) => {
        if (!allEvents.some((saved: any) => saved.id === event.id)) {
          allEvents.push({ ...event, type: 'attending' });
        }
      });

      return allEvents;
    } catch (error) {
      console.error('Error fetching saved activities:', error);
      return [];
    }
  }, []);

  const fetchPastActivities = useCallback(async (userId: string) => {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const { data: participantEvents, error } = await supabase
        .from('event_participants')
        .select('status, events(id, title, description, date, time, location, category, status, max_attendees, image_url)')
        .eq('user_id', userId)
        .eq('status', 'attending');

      if (error) throw error;

      const pastEvents = (participantEvents || [])
        .map((p: any) => p.events)
        .filter((event: any) => {
          if (!event?.date) return false;
          
          const eventDate = new Date(event.date);
          if (event.time) {
            const [hours, minutes] = event.time.split(':');
            eventDate.setHours(parseInt(hours), parseInt(minutes));
          }
          
          return eventDate < today && eventDate >= thirtyDaysAgo;
        })
        .map((event: any) => ({
          ...event,
          type: 'past_activity',
          attendees: event.max_attendees || 0
        }))
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return pastEvents;
    } catch (error) {
      console.error('Error fetching past activities:', error);
      return [];
    }
  }, []);

  const fetchFriends = useCallback(async (userId: string) => {
    try {
      const { data: friendsData, error } = await supabase
        .rpc('get_user_friends', { p_user_id: userId });

      if (error) throw error;

      return (friendsData || []).map((friend: any) => ({
        id: friend.id,
        name: friend.name || 'Unknown',
        username: friend.username || 'unknown',
        avatar_url: friend.avatar_url,
        status: 'offline' as const,
        lastActivity: 'Recently active'
      }));
    } catch (error) {
      console.error('Error fetching friends:', error);
      return [];
    }
  }, []);

  const loadAllData = useCallback(async () => {
    if (!targetUserId || !currentUser) return;

    updateLoading('initial', true);
    setData(prev => ({ ...prev, error: null }));

    try {
      // Check profile access for other users
      if (targetUserId !== currentUser.id) {
        try {
          const hasAccess = await checkCanViewProfile(targetUserId, currentUser.id);
          if (!hasAccess) {
            setData(prev => ({
              ...prev,
              error: 'Profile access denied',
              loading: {
                initial: false,
                profile: false,
                events: false,
                activities: false,
                media: false,
                friends: false,
              }
            }));
            return;
          }
        } catch (privacyError) {
          console.error('Privacy check error:', privacyError);
          // Continue with public access assumption
        }
      }

      // Load profile first (critical)
      updateLoading('profile', true);
      const profile = await fetchProfile(targetUserId);
      
      if (!profile && targetUserId === currentUser.id) {
        // Create profile for current user
        const defaultUsername = `user_${currentUser.user_metadata?.name ? currentUser.user_metadata.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '') : 'user'}_${currentUser.id.substring(0, 8)}`;
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: currentUser.id,
            name: currentUser.user_metadata?.name || currentUser.user_metadata?.full_name || 'User',
            username: defaultUsername,
            profile_completed: false
          })
          .select()
          .single();

        if (createError && createError.code !== '23505') {
          throw createError;
        }

        if (newProfile) {
          setData(prev => ({ ...prev, profile: newProfile }));
        }
      } else if (profile) {
        setData(prev => ({ ...prev, profile }));
      } else {
        throw new Error('Profile not found');
      }

      updateLoading('profile', false);

      // Load all other data in parallel
      const dataPromises = [];
      
      // User events
      updateLoading('events', true);
      dataPromises.push(
        fetchUserEvents(targetUserId).then(events => {
          setData(prev => ({ ...prev, userEvents: events }));
          updateLoading('events', false);
        })
      );

      // Saved activities (only for current user)
      if (isCurrentUserProfile) {
        updateLoading('activities', true);
        dataPromises.push(
          fetchSavedActivities(targetUserId).then(saved => {
            setData(prev => ({ ...prev, savedActivities: saved }));
            updateLoading('activities', false);
          })
        );

        // Past activities (only for current user)
        dataPromises.push(
          fetchPastActivities(targetUserId).then(past => {
            setData(prev => ({ ...prev, pastActivities: past }));
          })
        );
      } else {
        updateLoading('activities', false);
      }

      // Friends
      updateLoading('friends', true);
      dataPromises.push(
        fetchFriends(targetUserId).then(friends => {
          setData(prev => ({ ...prev, friends }));
          updateLoading('friends', false);
        })
      );

      // Media (only for current user)
      if (isCurrentUserProfile) {
        updateLoading('media', true);
        dataPromises.push(
          Promise.resolve().then(() => {
            try {
              const media = getUserMedia();
              setData(prev => ({ ...prev, userMedia: media }));
            } catch (error) {
              console.error('Media loading error:', error);
              setData(prev => ({ ...prev, userMedia: [] }));
            }
            updateLoading('media', false);
          })
        );
      } else {
        updateLoading('media', false);
      }

      // Wait for all parallel operations to complete
      await Promise.all(dataPromises);

    } catch (error: any) {
      console.error('Profile data loading error:', error);
      setData(prev => ({
        ...prev,
        error: error.message || 'Failed to load profile'
      }));
    } finally {
      updateLoading('initial', false);
    }
  }, [targetUserId, currentUser, isCurrentUserProfile, checkCanViewProfile, fetchProfile, fetchUserEvents, fetchSavedActivities, fetchPastActivities, fetchFriends, updateLoading]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const refetchData = useCallback(() => {
    loadAllData();
  }, [loadAllData]);

  const refreshMedia = useCallback(() => {
    if (isCurrentUserProfile) {
      try {
        const media = getUserMedia();
        setData(prev => ({ ...prev, userMedia: media }));
      } catch (error) {
        console.error('Error refreshing media:', error);
      }
    }
  }, [isCurrentUserProfile]);

  return {
    ...data,
    refetch: refetchData,
    refreshMedia
  };
};