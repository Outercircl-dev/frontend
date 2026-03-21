
import React from 'react';

interface UserHeaderProps {
  name: string;
  username: string;
  showFullProfile: boolean;
  viewMode: 'full' | 'participant' | 'request';
}

const UserHeader: React.FC<UserHeaderProps> = ({ 
  name, 
  username, 
  showFullProfile,
  viewMode
}) => {
  return (
    <div className="space-y-2">
      <h2 className="text-3xl font-bold text-gray-900 tracking-tight leading-tight font-sans">
        {name}
      </h2>
      {(showFullProfile || viewMode === 'full') && (
        <div className="flex items-center gap-1">
          <span className="text-lg text-gray-600 font-medium">@</span>
          <span className="text-lg text-gray-600 font-medium tracking-wide">{username}</span>
        </div>
      )}
    </div>
  );
};

export default UserHeader;
