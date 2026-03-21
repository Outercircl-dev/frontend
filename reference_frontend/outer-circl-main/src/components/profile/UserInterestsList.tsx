
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface UserInterestsListProps {
  interests: string[];
  className?: string;
}

const UserInterestsList: React.FC<UserInterestsListProps> = ({ 
  interests, 
  className = '' 
}) => {
  if (!interests || interests.length === 0) return null;
  
  return (
    <div className={`flex flex-wrap gap-2 mt-4 justify-center ${className}`}>
      {interests.map((interest, index) => (
        <Badge variant="secondary" key={index}>
          {interest}
        </Badge>
      ))}
    </div>
  );
};

export default UserInterestsList;
