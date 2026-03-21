
import React from 'react';

interface UserBioProps {
  bio?: string;
  showDetailedInfo: boolean;
  viewMode: 'full' | 'participant' | 'request';
  isCurrentUser?: boolean;
}

const UserBio: React.FC<UserBioProps> = ({ 
  bio, 
  showDetailedInfo,
  viewMode,
  isCurrentUser = false
}) => {
  if (!showDetailedInfo || (viewMode !== 'full' && !showDetailedInfo)) {
    return null;
  }

  // If no bio provided, show an empty state for current user or hide for others
  if (!bio || bio.trim() === '') {
    if (isCurrentUser) {
      return (
        <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-xl p-4 border border-pink-100">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Tell others about yourself</p>
            <p className="text-xs text-gray-500">
              Share your interests, hobbies, or what makes you unique
            </p>
          </div>
        </div>
      );
    }
    return null;
  }
  
  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 shadow-sm">
      <p className="text-sm text-gray-700 leading-relaxed text-center">{bio}</p>
    </div>
  );
};

export default UserBio;
