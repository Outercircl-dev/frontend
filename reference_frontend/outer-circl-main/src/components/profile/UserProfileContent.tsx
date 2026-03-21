
import React from 'react';
import UserProfileHeader from './UserProfileHeader';
import UserMetadata from './UserMetadata';
import UserDetailedInfo from './UserDetailedInfo';
import UserBio from './UserBio';
import UserStats from './UserStats';
import UserInterestsList from './UserInterestsList';
import LanguagesList from './LanguagesList';
import PremiumUpgradePrompt from './PremiumUpgradePrompt';
import { UserProfileSkeleton } from '@/components/ui/loading-skeleton';
import { UserProfileData } from '../UserProfileCard';

interface UserProfileContentProps {
  user: UserProfileData;
  viewMode: 'full' | 'participant' | 'request';
  showDetailedInfo: boolean;
  showReliabilityStars: boolean;
  reliabilityStarsToShow?: number;
  membershipTier: string;
  joinDateFormatted: string;
  birthDateFormatted: string | null;
  isLoading?: boolean;
}

const UserProfileContent: React.FC<UserProfileContentProps> = ({
  user,
  viewMode,
  showDetailedInfo,
  showReliabilityStars,
  reliabilityStarsToShow,
  membershipTier,
  joinDateFormatted,
  birthDateFormatted,
  isLoading = false
}) => {
  if (isLoading) {
    return <UserProfileSkeleton />;
  }

  // Ensure user object exists and has required fields
  if (!user || !user.name || !user.username) {
    return (
      <div className="space-y-6 p-6 text-center">
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <p className="text-sm text-red-600">Unable to load profile information</p>
          <p className="text-xs text-red-500 mt-1">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <UserProfileHeader
        name={user.name}
        username={user.username}
        avatarUrl={user.avatarUrl}
        showFullProfile={showDetailedInfo}
        viewMode={viewMode}
        showReliabilityStars={showReliabilityStars}
        reliabilityStarsToShow={reliabilityStarsToShow}
        membershipTier={membershipTier}
        isCurrentUser={!!user.isCurrentUser}
        isPreview={!!user.isPreview}
      />
      
      <div className="space-y-4">
        <UserMetadata 
          location={user.location}
          joinDate={joinDateFormatted}
          birthDateFormatted={birthDateFormatted}
          gender={user.gender}
          age={user.age}
          showFullDetails={viewMode === 'full' || showDetailedInfo}
        />
        
        <UserDetailedInfo 
          email={user.email}
          phone={user.phone}
          occupation={user.occupation}
          educationLevel={user.educationLevel}
          showFullProfile={showDetailedInfo && viewMode !== 'full'}
          isCurrentUser={!!user.isCurrentUser}
        />
        
        <UserBio 
          bio={user.bio} 
          showDetailedInfo={showDetailedInfo} 
          viewMode={viewMode}
          isCurrentUser={!!user.isCurrentUser}
        />
      </div>
      
      {/* Reliability stars section */}
      {showReliabilityStars && reliabilityStarsToShow !== undefined && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200 shadow-sm">
          <div className="text-center">
            <div className="text-sm font-medium text-gray-700 mb-2">Reliability Rating</div>
            <div className="flex items-center justify-center gap-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg 
                  key={i} 
                  className={`w-5 h-5 ${i < Math.round(reliabilityStarsToShow) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24"
                >
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              ))}
              <span className="text-sm font-semibold ml-2 text-gray-700">{reliabilityStarsToShow.toFixed(1)}</span>
            </div>
          </div>
        </div>
      )}
      
      {(viewMode === 'full' || showDetailedInfo) && (
        <UserStats 
          friendsCount={user.friendsCount || 0} 
          activitiesAttended={user.activitiesAttended || 0}
          activitiesHosted={user.activitiesHosted || 0}
        />
      )}
      
      <UserInterestsList interests={user.interests || []} />
      
      {showDetailedInfo && viewMode !== 'full' && (
        <LanguagesList 
          languages={user.languages || []} 
          isCurrentUser={!!user.isCurrentUser}
        />
      )}
      
      {!showDetailedInfo && (viewMode === 'participant' || viewMode === 'request') && (
        <PremiumUpgradePrompt />
      )}
    </div>
  );
};

export default UserProfileContent;
