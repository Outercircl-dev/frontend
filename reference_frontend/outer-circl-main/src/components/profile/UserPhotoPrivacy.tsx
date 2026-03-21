
import React from 'react';
import { Globe, Users, Lock } from 'lucide-react';

interface UserPhotoPrivacyProps {
  photoPrivacy?: 'public' | 'friends' | 'private';
  onPhotoPrivacyChange?: (privacy: 'public' | 'friends' | 'private') => void;
  isCurrentUser: boolean;
}

const UserPhotoPrivacy: React.FC<UserPhotoPrivacyProps> = ({ 
  photoPrivacy = 'public',
  onPhotoPrivacyChange,
  isCurrentUser
}) => {
  if (!isCurrentUser) return null;
  
  return (
    <div className="mt-2 flex justify-center items-center gap-2">
      <button 
        onClick={() => onPhotoPrivacyChange?.('public')}
        className={`p-1 rounded-full ${photoPrivacy === 'public' ? 'bg-pink-100' : 'bg-transparent'}`}
        title="Public - Anyone can view"
      >
        <Globe className="h-4 w-4" />
      </button>
      <button 
        onClick={() => onPhotoPrivacyChange?.('friends')}
        className={`p-1 rounded-full ${photoPrivacy === 'friends' ? 'bg-pink-100' : 'bg-transparent'}`}
        title="Friends only"
      >
        <Users className="h-4 w-4" />
      </button>
      <button 
        onClick={() => onPhotoPrivacyChange?.('private')}
        className={`p-1 rounded-full ${photoPrivacy === 'private' ? 'bg-pink-100' : 'bg-transparent'}`}
        title="Private - Only you can view"
      >
        <Lock className="h-4 w-4" />
      </button>
    </div>
  );
};

export default UserPhotoPrivacy;
