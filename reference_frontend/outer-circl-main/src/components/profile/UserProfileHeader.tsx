
import React from 'react';
import UserAvatar from './UserAvatar';
import UserHeader from './UserHeader';
import UserReliabilityRating from './UserReliabilityRating';

interface UserProfileHeaderProps {
  name: string;
  username: string;
  avatarUrl?: string;
  showFullProfile: boolean;
  viewMode: 'full' | 'participant' | 'request';
  showReliabilityStars: boolean;
  reliabilityStarsToShow?: number;
  membershipTier: string;
  isCurrentUser: boolean;
  isPreview: boolean;
}

const UserProfileHeader: React.FC<UserProfileHeaderProps> = ({
  name,
  username,
  avatarUrl,
  showFullProfile,
  viewMode,
  showReliabilityStars,
  reliabilityStarsToShow,
  membershipTier,
  isCurrentUser,
  isPreview
}) => {
  return (
    <div className="flex flex-col items-center">
      <UserAvatar 
        name={name} 
        avatarUrl={avatarUrl} 
        size="lg" 
        className="border-4 border-white shadow-lg -mt-16 relative z-10"
      />
      
      <div className="mt-4 text-center">
        <UserHeader 
          name={name} 
          username={username} 
          showFullProfile={showFullProfile}
          viewMode={viewMode}
        />
        
        <UserReliabilityRating
          showReliabilityStars={showReliabilityStars}
          reliabilityStarsToShow={reliabilityStarsToShow}
          membershipTier={membershipTier}
          isCurrentUser={isCurrentUser}
          isPreview={isPreview}
        />
      </div>
    </div>
  );
};

export default UserProfileHeader;
