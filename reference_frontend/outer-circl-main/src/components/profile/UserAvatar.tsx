
import React, { useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera } from 'lucide-react';

interface UserAvatarProps {
  name: string;
  avatarUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showUploadButton?: boolean;
  onUpload?: () => void;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ 
  name, 
  avatarUrl, 
  size = 'md',
  className = '',
  showUploadButton = false,
  onUpload
}) => {
  // Debug logging for troubleshooting
  useEffect(() => {
    if (!avatarUrl) {
      console.log('🔷 UserAvatar: No avatar URL, showing fallback letter:', name.charAt(0));
    }
  }, [avatarUrl, name]);
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-16 w-16',
    lg: 'h-28 w-28'
  };

  const fallbackSizeClasses = {
    sm: 'text-sm',
    md: 'text-xl',
    lg: 'text-3xl'
  };

  const uploadButtonSizeClasses = {
    sm: 'h-4 w-4 p-1',
    md: 'h-6 w-6 p-1',
    lg: 'h-8 w-8 p-2'
  };

  return (
    <div className="relative">
      <Avatar className={`${sizeClasses[size]} ${className} ring-2 ring-white shadow-lg`}>
        <AvatarImage 
          src={avatarUrl || "/placeholder.svg"} 
          alt={name} 
          className="object-cover" 
        />
        <AvatarFallback className={`${fallbackSizeClasses[size]} bg-gradient-to-br from-brand-salmon via-purple-500 to-blue-500 text-white font-bold`}>
          {name.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      {showUploadButton && onUpload && (
        <button
          onClick={onUpload}
          className={`absolute bottom-0 right-0 ${uploadButtonSizeClasses[size]} bg-white/90 backdrop-blur-sm rounded-full hover:bg-white transition-all shadow-lg border border-gray-200`}
        >
          <Camera className="h-3 w-3 text-gray-700" />
        </button>
      )}
    </div>
  );
};

export default UserAvatar;
