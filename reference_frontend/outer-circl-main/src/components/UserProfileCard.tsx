import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMembership } from '@/components/OptimizedProviders';
import { toast } from 'sonner';
import { Flag, Shield, Users } from 'lucide-react';
import { useProfilePrivacy } from '@/hooks/useProfilePrivacy';
import { supabase } from '@/integrations/supabase/client';

// Import the components
import UserActions from './profile/UserActions';
import UserProfileStatus from './profile/UserProfileStatus';
import UserProfileContent from './profile/UserProfileContent';
import ReportUserModal from './profile/ReportUserModal';

export interface UserProfileData {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
  location?: string;
  bio?: string;
  joinDate: string;
  birthMonth?: number;
  birthYear?: number;
  friendsCount: number;
  activitiesAttended: number;
  activitiesHosted: number;
  interests: string[];
  isCurrentUser?: boolean;
  isFriend?: boolean;
  isPendingFriend?: boolean;
  isPreview?: boolean;
  reliabilityStars?: number;
  gender?: string;
  age?: number;
  email?: string;
  phone?: string;
  occupation?: string;
  educationLevel?: string;
  languages?: string[];
  photoPrivacy?: 'public' | 'friends' | 'private';
}

interface UserProfileCardProps {
  user: UserProfileData;
  className?: string;
  onAddFriend?: (userId: string) => void;
  onMessage?: (userId: string) => void;
  viewMode?: 'full' | 'participant' | 'request';
  onPhotoPrivacyChange?: (privacy: 'public' | 'friends' | 'private') => void;
  isLoading?: boolean;
}

const UserProfileCard: React.FC<UserProfileCardProps> = ({ 
  user, 
  className,
  onAddFriend,
  onMessage,
  viewMode = 'full',
  onPhotoPrivacyChange,
  isLoading = false
}) => {
  const { region, consentType, consentProvided, updateConsent, membershipTier, reliabilityStars, canViewOthersReliability } = useMembership();
  const [hasConsented, setHasConsented] = useState(consentProvided);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [accessLevel, setAccessLevel] = useState<'none' | 'limited' | 'full'>('full');
  const [profileAccessChecked, setProfileAccessChecked] = useState(false);

  const {
    sendFriendRequest,
    isFriend,
    hasPendingRequest,
    checkCanViewProfile
  } = useProfilePrivacy(currentUserId);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setCurrentUserId(currentUser?.id || null);
    };
    getCurrentUser();
  }, []);

  useEffect(() => {
    const checkProfileAccess = async () => {
      if (!currentUserId || !user.id) {
        setAccessLevel('none');
        setProfileAccessChecked(true);
        return;
      }

      if (user.isCurrentUser) {
        setAccessLevel('full');
        setProfileAccessChecked(true);
        return;
      }

      // Check access level for other users' profiles
      const accessLevelResult = await checkCanViewProfile(user.id, currentUserId);
      setAccessLevel(accessLevelResult as 'none' | 'limited' | 'full');
      setProfileAccessChecked(true);
    };

    if (user.id) {
      checkProfileAccess();
    }
  }, [currentUserId, user.id, user.isCurrentUser, checkCanViewProfile]);

  const joinDateFormatted = new Date(user.joinDate).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric'
  });

  const birthDateFormatted = user.birthMonth && user.birthYear ? 
    new Date(user.birthYear, user.birthMonth - 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    }) : null;

  const handleAddFriend = async () => {
    if ((consentType === 'gdpr' || consentType === 'ccpa') && !hasConsented) {
      toast.error(`Please provide ${consentType.toUpperCase()} consent before connecting with others`);
      return;
    }
    
    if (currentUserId && user.id) {
      const success = await sendFriendRequest(user.id);
      if (success && onAddFriend) {
        onAddFriend(user.id);
      }
    } else if (onAddFriend) {
      onAddFriend(user.id);
    }
  };

  const handleMessage = () => {
    if ((consentType === 'gdpr' || consentType === 'ccpa') && !hasConsented) {
      toast.error(`Please provide ${consentType.toUpperCase()} consent before messaging others`);
      return;
    }
    
    if (onMessage) {
      onMessage(user.id);
    }
  };

  const handleConsentChange = (checked: boolean) => {
    setHasConsented(checked);
    updateConsent(checked);
    if (checked) {
      toast.success(`${consentType?.toUpperCase()} consent provided`);
    }
  };

  // Show loading state while checking profile access
  if (!profileAccessChecked && !user.isCurrentUser) {
    return (
      <div className={`bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/30 overflow-hidden ${className} transition-all hover:shadow-2xl font-sans`}>
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show privacy restricted view if user cannot view profile
  if (accessLevel === 'none' && !user.isCurrentUser) {
    return (
      <div className={`bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/30 overflow-hidden ${className} transition-all hover:shadow-2xl font-sans`}>
        <div className="relative h-32 bg-gradient-to-br from-gray-400 via-gray-500 to-gray-600">
          <div className="absolute inset-0 bg-black/20"></div>
        </div>
        
        <div className="relative px-6 pb-6">
          <div className="flex flex-col items-center text-center pt-6">
            <div className="w-20 h-20 bg-gray-300 rounded-full mb-4 flex items-center justify-center">
              <Shield className="h-8 w-8 text-gray-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Profile Private</h3>
            <p className="text-sm text-gray-500 mb-4">
              This user's profile is private. Send a friend request to view their profile.
            </p>
            
            {currentUserId && !hasPendingRequest(user.id) && !isFriend(user.id) && (
              <button
                onClick={handleAddFriend}
                className="px-4 py-2 bg-brand-salmon hover:bg-brand-dark-salmon text-white rounded-lg transition-colors"
              >
                Send Friend Request
              </button>
            )}
            
            {hasPendingRequest(user.id) && (
              <div className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg">
                Friend Request Sent
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const showDetailedInfo = user.isCurrentUser || !user.isPreview;
  
  // Enhanced logic for showing reliability stars
  const showReliabilityStars = user.isCurrentUser || 
    (canViewOthersReliability && !user.isPreview) || 
    (membershipTier === 'premium' && !user.isPreview) ||
    (isFriend(user.id) && membershipTier === 'premium');
  
  const reliabilityStarsToShow = user.isCurrentUser ? reliabilityStars : user.reliabilityStars;

  // Update friend status based on privacy hook
  const updatedUser = {
    ...user,
    isFriend: currentUserId ? isFriend(user.id) : user.isFriend,
    isPendingFriend: currentUserId ? hasPendingRequest(user.id) : user.isPendingFriend
  };

  // Modern card styling inspired by Pinterest with brand colors
  return (
    <div className={`bg-white/90 backdrop-blur-sm rounded-3xl shadow-xl border border-white/30 overflow-hidden ${className} ${user.isPreview ? 'ring-2 ring-brand-salmon/30' : ''} transition-all hover:shadow-2xl font-sans`}>
      <UserProfileStatus isPreview={!!user.isPreview} viewMode={viewMode} />
      
      {/* Hero background with brand gradient */}
      <div className="relative h-32 bg-gradient-to-br from-brand-salmon via-purple-500 to-pink-500">
        <div className="absolute inset-0 bg-black/10"></div>
      </div>
      
      <div className="relative px-6 pb-6">
        <UserProfileContent
          user={updatedUser}
          viewMode={viewMode}
          showDetailedInfo={accessLevel === 'full' ? showDetailedInfo : false}
          showReliabilityStars={accessLevel === 'full' ? showReliabilityStars : false}
          reliabilityStarsToShow={reliabilityStarsToShow}
          membershipTier={membershipTier}
          joinDateFormatted={joinDateFormatted}
          birthDateFormatted={accessLevel === 'full' ? birthDateFormatted : null}
          isLoading={isLoading}
        />
        
        {/* Show "Add Friend to see more" message for limited access */}
        {accessLevel === 'limited' && !user.isCurrentUser && (
          <div className="text-center py-4 border-t border-border mt-4">
            <p className="text-muted-foreground mb-3">Add {user.name} as a friend to see their full profile</p>
            <div className="flex justify-center">
              {isFriend(user.id) ? (
                <Button variant="outline" disabled>
                  <Users className="mr-2 h-4 w-4" />
                  Already Friends
                </Button>
              ) : hasPendingRequest(user.id) ? (
                <Button variant="outline" disabled>
                  <Users className="mr-2 h-4 w-4" />
                  Request Sent
                </Button>
              ) : (
                <Button onClick={handleAddFriend} className="bg-brand-purple hover:bg-brand-light-purple">
                  <Users className="mr-2 h-4 w-4" />
                  Add Friend
                </Button>
              )}
            </div>
          </div>
        )}
        
        {/* Report button - only show when viewing other users profiles */}
        {!user.isCurrentUser && !user.isPreview && !isLoading && (
          <div className="mt-4 flex justify-center">
            <button 
              onClick={() => setReportModalOpen(true)}
              className="text-xs text-gray-400 hover:text-brand-salmon flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-pink-50 transition-all duration-200 font-medium"
            >
              <Flag className="h-3 w-3" />
              Report this user
            </button>
          </div>
        )}
      </div>
      
      {!user.isCurrentUser && !user.isPreview && viewMode === 'full' && !isLoading && (
        <div className="px-6 pb-6">
          <UserActions
            isFriend={!!updatedUser.isFriend}
            isPendingFriend={!!updatedUser.isPendingFriend}
            onAddFriend={handleAddFriend}
            onMessage={handleMessage}
          />
        </div>
      )}
      
      {/* Report user modal */}
      <ReportUserModal
        open={reportModalOpen}
        onOpenChange={setReportModalOpen}
        username={user.username}
        userId={user.id}
      />
    </div>
  );
};

export default UserProfileCard;
