
import React from 'react';
import { ShieldCheck, Star } from 'lucide-react';
import ReliabilityStarsDisplay from '../ReliabilityStarsDisplay';

interface UserReliabilityRatingProps {
  showReliabilityStars: boolean;
  reliabilityStarsToShow?: number;
  membershipTier: string;
  isCurrentUser: boolean;
  isPreview: boolean;
}

const UserReliabilityRating: React.FC<UserReliabilityRatingProps> = ({
  showReliabilityStars,
  reliabilityStarsToShow,
  membershipTier,
  isCurrentUser,
  isPreview
}) => {
  if (showReliabilityStars && typeof reliabilityStarsToShow === 'number' && reliabilityStarsToShow > 0) {
    return (
      <div className="mt-1 mb-2">
        <ReliabilityStarsDisplay 
          rating={reliabilityStarsToShow} 
          showTooltip={true}
          className="bg-pink-50 px-2 py-0.5 rounded-full shadow-sm border border-pink-100"
        />
      </div>
    );
  }
  
  if (!showReliabilityStars && membershipTier === 'standard' && !isCurrentUser && !isPreview) {
    return (
      <div className="mt-1 mb-2 text-xs text-muted-foreground flex items-center bg-pink-50 px-2 py-0.5 rounded-full shadow-sm border border-pink-100">
        <Star className="h-3.5 w-3.5 mr-1" />
        <span>Upgrade to premium to view rating</span>
      </div>
    );
  }
  
  return null;
};

export default UserReliabilityRating;
