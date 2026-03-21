
import React from 'react';

interface UserDetailedInfoProps {
  email?: string;
  phone?: string;
  occupation?: string;
  languages?: string[];
  educationLevel?: string;
  showFullProfile: boolean;
  isCurrentUser: boolean;
}

const UserDetailedInfo: React.FC<UserDetailedInfoProps> = ({
  email,
  phone,
  occupation,
  languages,
  educationLevel,
  showFullProfile,
  isCurrentUser
}) => {
  // Only show this information if it's the current user's own profile
  if (!showFullProfile || !isCurrentUser) return null;
  
  // Check if we have any information to display
  const hasAnyInfo = email || phone || occupation || educationLevel;
  
  if (!hasAnyInfo) {
    return (
      <div className="mt-3 w-full p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-100">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">Complete your profile</p>
          <p className="text-xs text-gray-500">
            Add your contact details and professional information to help others connect with you
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="mt-3 w-full space-y-2">
      {email && (
        <div className="text-sm flex items-center justify-center">
          <span className="font-medium mr-2">Email:</span>
          <span className="text-gray-700">{email}</span>
        </div>
      )}
      
      {phone && (
        <div className="text-sm flex items-center justify-center">
          <span className="font-medium mr-2">Phone:</span>
          <span className="text-gray-700">{phone}</span>
        </div>
      )}
      
      {occupation && (
        <div className="text-sm flex items-center justify-center">
          <span className="font-medium mr-2">Occupation:</span>
          <span className="text-gray-700">{occupation}</span>
        </div>
      )}
      
      {educationLevel && (
        <div className="text-sm flex items-center justify-center">
          <span className="font-medium mr-2">Education:</span>
          <span className="text-gray-700">{educationLevel}</span>
        </div>
      )}
    </div>
  );
};

export default UserDetailedInfo;
