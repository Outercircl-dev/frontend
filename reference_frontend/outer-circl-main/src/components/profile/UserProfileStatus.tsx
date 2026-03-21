
import React from 'react';

interface UserProfileStatusProps {
  isPreview: boolean;
  viewMode: 'full' | 'participant' | 'request';
}

const UserProfileStatus: React.FC<UserProfileStatusProps> = ({ 
  isPreview, 
  viewMode 
}) => {
  if (isPreview) {
    return (
      <div className="bg-pink-100 text-pink-700 py-1 px-3 text-xs font-medium text-center">
        Preview Mode - How Others See Your Profile
      </div>
    );
  }
  
  if (viewMode === 'request') {
    return (
      <div className="bg-pink-50 text-pink-700 py-1 px-3 text-xs font-medium text-center">
        Event Request
      </div>
    );
  }
  
  return null;
};

export default UserProfileStatus;
