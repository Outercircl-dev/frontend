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
import { useMembership } from '@/components/OptimizedProviders';
import { useOptimizedProfileData } from '@/hooks/useOptimizedProfileData';
import Navbar from '@/components/Navbar';
import ProfileBreadcrumb from '@/components/profile/ProfileBreadcrumb';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfileTabs from '@/components/profile/ProfileTabs';

const OptimizedProfile = () => {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [photoUploadOpen, setPhotoUploadOpen] = useState(false);
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [activeContentView, setActiveContentView] = useState<'media' | 'friends' | 'about' | 'messages' | 'saved'>('about');
  
  const { membershipTier, reliabilityStars, canViewOthersReliability } = useMembership();

  // Handle both URL path parameter and query parameter for user ID
  const userId = params.userId || searchParams.get('user');
  const isCurrentUserProfile = !userId || (currentUser && userId === currentUser.id);
  const targetUserId = userId || currentUser?.id;

  // Use optimized data loading hook
  const {
    profile: profileData,
    userEvents,
    savedActivities,
    pastActivities,
    userMedia,
    friends: userFriends,
    error,
    loading,
    refetch,
    refreshMedia
  } = useOptimizedProfileData(targetUserId, currentUser, isCurrentUserProfile);

  // Initialize authentication
  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Auth error:', authError);
          setAuthLoading(false);
          return;
        }

        if (!user) {
          navigate('/auth');
          return;
        }

        setCurrentUser(user);
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setAuthLoading(false);
      }
    };

    initAuth();
  }, [navigate]);

  // Validate user ID format
  useEffect(() => {
    if (userId && !userId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
      toast.error('Invalid user ID format');
      navigate('/dashboard');
    }
  }, [userId, navigate]);

  const handleProfileUpdate = (updatedProfile: any) => {
    console.log('🔄 OptimizedProfile: handleProfileUpdate called with:', updatedProfile);
    // Call refetch to get the latest data from the database
    refetch();
    toast.success('Profile updated successfully!');
  };

  const handleMediaUploaded = () => {
    refreshMedia();
    toast.success('Media uploaded successfully!');
  };

  const handleBannerUpdated = (bannerUrl: string) => {
    refetch();
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

  // Show auth loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 font-sans">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-brand-salmon"></div>
        </div>
      </div>
    );
  }

  // Show progressive loading with skeleton for profile data
  if (loading.initial || loading.profile) {
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
              <Button onClick={refetch} className="w-full bg-brand-salmon hover:bg-brand-dark-salmon">
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
              <Button onClick={refetch} className="w-full bg-brand-salmon hover:bg-brand-dark-salmon">
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
        avatarUrl={profileData?.avatar_url}
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
            onBannerChange={() => setBannerModalOpen(true)}
            onMessageUser={handleMessageUser}
            onViewSettings={handleViewSettings}
            onPrivacySettings={handlePrivacySettings}
            currentUserId={currentUser?.id}
          />

          <ProfileTabs
            isCurrentUser={isCurrentUserProfile}
            userId={profileData?.id}
          />
        </div>

        {/* Modals */}
        {editModalOpen && (
          <EditProfileModal
            open={editModalOpen}
            onOpenChange={setEditModalOpen}
            profileData={profileData}
            onProfileUpdate={handleProfileUpdate}
          />
        )}

        {photoUploadOpen && (
          <MediaUploadModal
            open={photoUploadOpen}
            onOpenChange={setPhotoUploadOpen}
            onMediaUploaded={handleMediaUploaded}
          />
        )}

        {bannerModalOpen && (
          <BannerImageModal
            open={bannerModalOpen}
            onOpenChange={setBannerModalOpen}
            onBannerUpdate={handleBannerUpdated}
            currentBannerUrl={profileData?.banner_url}
          />
        )}

        {privacyModalOpen && (
          <PrivacySettingsModal
            open={privacyModalOpen}
            onOpenChange={setPrivacyModalOpen}
            userId={currentUser?.id || profileData?.id}
          />
        )}
      </div>
    </>
  );
};

export default OptimizedProfile;