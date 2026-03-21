import React, { useState, useEffect } from 'react';
import UnifiedSEO from '@/components/UnifiedSEO';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { UserProfileSkeleton } from '@/components/ui/loading-skeleton';
import EditProfileModal from '@/components/profile/EditProfileModal';
import MediaUploadModal from '@/components/profile/MediaUploadModal';
import BannerImageModal from '@/components/profile/BannerImageModal';
import PrivacySettingsModal from '@/components/profile/PrivacySettingsModal';
import { getUserMedia } from '@/utils/mediaStorage';
import { useMembership } from '@/components/OptimizedProviders';
import { useProfilePrivacy } from '@/hooks/useProfilePrivacy';
import { usePastActivities } from '@/hooks/usePastActivities';
import { useFriends } from '@/hooks/useFriends';
import Navbar from '@/components/Navbar';
import ProfileBreadcrumb from '@/components/profile/ProfileBreadcrumb';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileTabs from '@/components/profile/ProfileTabs';

const Profile = () => {
  // Safe router hook usage with fallback for edge cases
  let navigate: any;
  let params: any;
  let searchParams: URLSearchParams;
  
  try {
    navigate = useNavigate();
    params = useParams();
    const [sp] = useSearchParams();
    searchParams = sp;
  } catch (error) {
    console.error('⚠️ Profile: Router context not available, using fallbacks');
    // Fallback: Use window navigation
    navigate = (path: string, options?: any) => {
      console.log('⚠️ Using fallback navigation to:', path);
      window.location.href = path;
    };
    params = {};
    searchParams = new URLSearchParams(window.location.search);
  }
  
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [photoUploadOpen, setPhotoUploadOpen] = useState(false);
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [activeContentView, setActiveContentView] = useState<'media' | 'friends' | 'about' | 'messages' | 'saved'>('about');
  const [userMedia, setUserMedia] = useState<any[]>([]);
  const [userEvents, setUserEvents] = useState<any[]>([]);
  const [savedActivities, setSavedActivities] = useState<any[]>([]);
  
  
  const { membershipTier, reliabilityStars, canViewOthersReliability } = useMembership();

  // Handle both URL path parameter and query parameter for user ID
  const userId = params.userId || searchParams.get('user');
  const isCurrentUserProfile = !userId || (currentUser && userId === currentUser.id);

  const { checkCanViewProfile } = useProfilePrivacy(currentUser?.id);
  
  // Get past activities for current user's profile
  const targetUserId = userId || currentUser?.id;
  const { pastActivities } = usePastActivities(isCurrentUserProfile ? targetUserId : null);
  
  // Use the useFriends hook for fetching friends data
  const { friends: userFriends, loading: friendsLoading } = useFriends(targetUserId);

  // Fetch user's events
  const fetchUserEvents = async (targetUserId: string) => {
    try {
      const { data: events, error } = await supabase
        .from('events')
        .select('*')
        .eq('host_id', targetUserId)
        .eq('status', 'active')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching user events:', error);
        return [];
      }

      return events || [];
    } catch (error) {
      console.error('Error fetching user events:', error);
      return [];
    }
  };

  // Fetch saved activities from database (not localStorage)
  const fetchSavedActivities = async (currentUserId: string) => {
    try {
      // Get saved events from database
      const { data: savedEventsData, error } = await supabase
        .from('saved_events')
        .select(`
          id,
          events(*)
        `)
        .eq('user_id', currentUserId);

      if (error) {
        console.error('Error fetching saved events:', error);
      }

      // Extract events from the join result
      const savedEvents = (savedEventsData || [])
        .map((se: any) => se.events)
        .filter((event: any) => event !== null);

      // Get future events the user is attending
      const { data: participantEvents, error: participantError } = await supabase
        .from('event_participants')
        .select(`
          status,
          events(*)
        `)
        .eq('user_id', currentUserId)
        .eq('status', 'attending');

      if (participantError) {
        console.error('Error fetching participant events:', participantError);
      }

      // Filter for future events
      const futureAttendingEvents = (participantEvents || [])
        .map((p: any) => p.events)
        .filter((event: any) => {
          if (!event?.date) return false;
          const eventDate = new Date(event.date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return eventDate >= today;
        });

      // Combine saved events and future attending events, removing duplicates
      const allEvents = [...savedEvents];
      futureAttendingEvents.forEach((event: any) => {
        if (!allEvents.some((saved: any) => saved.id === event.id)) {
          allEvents.push({ ...event, type: 'attending' });
        }
      });

      console.log('Profile.tsx: Found saved + attending events:', allEvents);
      return allEvents;
    } catch (error) {
      console.error('Error fetching saved activities:', error);
      return [];
    }
  };


  // Single initialization effect
  useEffect(() => {
    let mounted = true;
    
    const initializeProfile = async () => {
      try {
        console.log('Profile: Starting initialization...');
        
        // Get current user first
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Auth error:', authError);
          if (mounted) {
            setError('Authentication error. Please log in.');
            setLoading(false);
          }
          return;
        }

        if (!user) {
          console.log('Profile: No authenticated user, redirecting to auth');
          navigate('/auth');
          return;
        }

        if (mounted) {
          setCurrentUser(user);
        }
        
        const targetUserId = userId || user.id;
        console.log('Profile: Target user ID:', targetUserId);
        
        // Simple UUID validation
        if (userId && !userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
          if (mounted) {
            setError('Invalid user ID format');
            setLoading(false);
          }
          return;
        }

        // For other users, verify access using the RPC function 
        if (targetUserId !== user.id) {
          console.log('Profile: Checking access for other user profile');
          
          try {
            const { data: canView, error: accessError } = await supabase
              .rpc('can_view_profile', {
                profile_id: targetUserId,
                viewing_user_id: user.id
              });
              
            console.log('Profile: Access check result:', { canView, error: accessError });
            
            if (accessError || !canView) {
              console.log('Profile: Access denied or error:', accessError);
              if (mounted) {
                setError('Profile access denied');
                setLoading(false);
              }
              return;
            }
          } catch (privacyError) {
            console.error('Privacy check error:', privacyError);
            // Continue but log the issue
            console.log('Profile: Continuing despite privacy check error');
          }
        }

        // Fetch profile data using the secure view that handles RLS properly
        console.log('Profile: Fetching profile data for:', targetUserId);
        
        // Try profiles_public_secure first (handles privacy settings properly)
        let profile, profileError;
        
        try {
          const publicResult = await supabase
            .from('profiles_public_secure')
            .select('*')
            .eq('id', targetUserId)
            .maybeSingle();
            
          profile = publicResult.data;
          profileError = publicResult.error;
          
          console.log('Profile: profiles_public_secure result:', { profile, error: profileError });
        } catch (error) {
          console.log('Profile: profiles_public_secure failed, trying regular profiles:', error);
          
          // Fallback to regular profiles table
          const fallbackResult = await supabase
            .from('profiles')
            .select('*')
            .eq('id', targetUserId)
            .maybeSingle();
            
          profile = fallbackResult.data;
          profileError = fallbackResult.error;
          
          console.log('Profile: regular profiles result:', { profile, error: profileError });
        }

        if (profileError) {
          console.error('Profile fetch error:', profileError);
          if (mounted) {
            setError('Error loading profile');
            setLoading(false);
          }
          return;
        }

        if (profile) {
          console.log('Profile: Profile data loaded successfully:', profile);
          if (mounted) {
            setProfileData(profile);
            // Update document title immediately
            document.title = `${profile?.name || 'User'} Profile - outercircl`;
          }

          // Fetch related data
          const [events, saved] = await Promise.all([
            fetchUserEvents(targetUserId),
            targetUserId === user.id ? fetchSavedActivities(user.id) : []
          ]);

          if (mounted) {
            setUserEvents(events);
            setSavedActivities(saved);
          }
        } else if (targetUserId === user.id) {
          // Create profile for current user only
          console.log('Profile: Creating new profile for current user');
          // Generate a default username for the user
          const defaultUsername = `user_${user.user_metadata?.name ? user.user_metadata.name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '') : 'user'}_${user.id.substring(0, 8)}`;
          
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              name: user.user_metadata?.name || user.user_metadata?.full_name || 'User',
              email: user.email,
              username: defaultUsername,
              profile_completed: false
            })
            .select()
            .single();

          if (createError && createError.code !== '23505') {
            console.error('Profile creation error:', createError);
            if (mounted) {
              setError('Error creating profile');
              setLoading(false);
            }
            return;
          }

          if (newProfile && mounted) {
            setProfileData(newProfile);
          }
        } else {
          console.error('Profile: No profile data found for user:', targetUserId);
          console.log('Profile: Search worked but profile fetch failed - checking database directly');
          
          // Additional debugging - try direct query to see what's happening
          try {
            const { data: debugProfile, error: debugError } = await supabase
              .from('profiles')
              .select('id, name, username')
              .eq('id', targetUserId);
              
            console.log('Profile: Debug query result:', { debugProfile, debugError });
          } catch (debugErr) {
            console.log('Profile: Debug query failed:', debugErr);
          }
          
          if (mounted) {
            setError(`Profile not found - User ID: ${targetUserId}`);
            setLoading(false);
          }
          return;
        }

        // Load user media (don't fail the whole page for this)
        try {
          const media = getUserMedia();
          if (mounted) {
            setUserMedia(media);
          }
        } catch (mediaError) {
          console.error('Media loading error:', mediaError);
          if (mounted) {
            setUserMedia([]);
          }
        }

      } catch (error) {
        console.error('Profile initialization error:', error);
        if (mounted) {
          setError('Failed to load profile');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeProfile();

    return () => {
      mounted = false;
    };
  }, [userId, navigate]); // Simplified dependencies

  const handleProfileUpdate = (updatedProfile: any) => {
    console.log('🔄 Profile: handleProfileUpdate called with:', updatedProfile);
    setProfileData(updatedProfile);
    toast.success('Profile updated successfully!');
  };

  const handleMediaUploaded = () => {
    try {
      const refreshedMedia = getUserMedia();
      setUserMedia(refreshedMedia);
      toast.success('Media uploaded successfully!');
    } catch (error) {
      console.error('Error refreshing media:', error);
      toast.error('Error refreshing media');
    }
  };

  const handleBannerUpdated = (bannerUrl: string) => {
    setProfileData({ ...profileData, banner_url: bannerUrl });
    toast.success('Banner image updated successfully!');
  };

  const handleCreateActivity = (mediaItem: any) => {
    navigate('/create-event', { state: { selectedMedia: mediaItem } });
  };

  const handleShareWithFriends = (mediaItem: any) => {
    toast.success('Sharing with friends functionality coming soon!');
  };

  const handleActivityClick = (activityId: string) => {
    navigate(`/event/${activityId}`);
  };

  const handleMessageUser = () => {
    navigate('/messages', { state: { userId: profileData?.id } });
  };

  const handleViewSettings = () => {
    navigate('/settings');
  };

  const handlePrivacySettings = () => {
    setPrivacyModalOpen(true);
  };

  const handleContentViewChange = (view: string) => {
    setActiveContentView(view as 'media' | 'friends' | 'about' | 'messages' | 'saved');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 font-sans">
        <Navbar isLoggedIn={!!currentUser} username={currentUser?.user_metadata?.username || currentUser?.user_metadata?.name || 'User'} />
        <div className="py-8">
          <div className="max-w-7xl mx-auto px-4">
            <UserProfileSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (error === 'Profile access denied') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 font-sans">
        <Navbar isLoggedIn={!!currentUser} username={currentUser?.user_metadata?.username || currentUser?.user_metadata?.name || 'User'} />
        <div className="flex items-center justify-center py-20">
          <div className="text-center bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 max-w-md mx-4 border border-white/20">
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-serif">Profile Private</h2>
            <p className="text-gray-600 mb-4">
              This user's profile is private. You need to be friends to view their profile.
            </p>
            <Button asChild className="w-full bg-brand-salmon hover:bg-brand-dark-salmon">
              <Link to="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 font-sans">
        <Navbar isLoggedIn={!!currentUser} username={currentUser?.user_metadata?.username || currentUser?.user_metadata?.name || 'User'} />
        <div className="flex items-center justify-center py-20">
          <div className="text-center bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 max-w-md mx-4 border border-white/20">
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-serif">Profile Error</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            <div className="space-y-2">
              <Button onClick={() => window.location.reload()} className="w-full bg-brand-salmon hover:bg-brand-dark-salmon">
                Retry
              </Button>
              <Button asChild variant="outline" className="w-full border-gray-300 hover:border-brand-salmon hover:text-brand-salmon">
                <Link to="/dashboard">Back to Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 font-sans">
        <Navbar isLoggedIn={!!currentUser} username={currentUser?.user_metadata?.username || currentUser?.user_metadata?.name || 'User'} />
        <div className="flex items-center justify-center py-20">
          <div className="text-center bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl p-8 max-w-md mx-4 border border-white/20">
            <h2 className="text-xl font-bold text-gray-900 mb-2 font-serif">Profile Not Found</h2>
            <p className="text-gray-600 mb-4">We couldn't load the profile information.</p>
            <div className="space-y-2">
              <Button onClick={() => window.location.reload()} className="w-full bg-brand-salmon hover:bg-brand-dark-salmon">
                Retry
              </Button>
              <Button asChild variant="outline" className="w-full border-gray-300 hover:border-brand-salmon hover:text-brand-salmon">
                <Link to="/dashboard">Back to Dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stats = { activities: userEvents.length };

  const showReliabilityStars = !isCurrentUserProfile && canViewOthersReliability;
  const userReliabilityRating = profileData?.reliability_rating || 4.2;

  return (
    <>
      <UnifiedSEO 
        title={`${profileData?.name || 'User'} Profile - outercircl`}
        description={`View ${profileData?.name || 'User'}'s profile on outercircl. Find an activity friend near you.`}
        canonicalUrl={`https://outercircl.com/profile/${profileData?.id || ''}`}
        noIndex={true}
      />
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 font-sans">
        
      <Navbar 
        isLoggedIn={!!currentUser} 
        username={currentUser?.user_metadata?.username || currentUser?.user_metadata?.name || 'User'}
        avatarUrl={profileData?.avatar_url || currentUser?.user_metadata?.avatar_url}
      />

      <ProfileBreadcrumb
        isCurrentUserProfile={isCurrentUserProfile}
        profileName={profileData?.name}
      />

      <div className="max-w-6xl mx-auto px-4 pb-8">
          <ProfileHeader
            profileData={profileData}
            isCurrentUserProfile={isCurrentUserProfile}
            showReliabilityStars={showReliabilityStars}
            userReliabilityRating={userReliabilityRating}
            stats={stats}
            onEditProfile={() => setEditModalOpen(true)}
            onPhotoUpload={() => setPhotoUploadOpen(true)}
            onViewSettings={handleViewSettings}
            onPrivacySettings={handlePrivacySettings}
            onBannerChange={() => setBannerModalOpen(true)}
            onMessageUser={handleMessageUser}
            currentUserId={currentUser?.id}
          />

        <ProfileTabs
          isCurrentUser={isCurrentUserProfile}
          userId={profileData?.id}
        />
      </div>

      {isCurrentUserProfile && profileData && (
        <>
        <EditProfileModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          profileData={profileData}
          onProfileUpdate={handleProfileUpdate}
        />
          
          <MediaUploadModal
            open={photoUploadOpen}
            onOpenChange={setPhotoUploadOpen}
            onMediaUploaded={handleMediaUploaded}
          />
          
          <BannerImageModal
            open={bannerModalOpen}
            onOpenChange={setBannerModalOpen}
            currentBannerUrl={profileData?.banner_url}
            onBannerUpdate={handleBannerUpdated}
          />

          <PrivacySettingsModal
            open={privacyModalOpen}
            onOpenChange={setPrivacyModalOpen}
            userId={profileData.id}
          />
        </>
      )}
      </div>
    </>
  );
};

export default Profile;
