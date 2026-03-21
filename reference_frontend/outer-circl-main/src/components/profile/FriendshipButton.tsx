import React from 'react';
import { Button } from '@/components/ui/button';
import { UserPlus, UserMinus, Clock, Check, X } from 'lucide-react';
import { useFriendshipActions, FriendshipStatus } from '@/hooks/useFriendshipActions';

interface FriendshipButtonProps {
  currentUserId?: string;
  targetUserId?: string;
  size?: 'sm' | 'lg';
  className?: string;
}

const FriendshipButton: React.FC<FriendshipButtonProps> = ({
  currentUserId,
  targetUserId,
  size = 'sm',
  className = ''
}) => {
  const {
    friendshipStatus,
    loading,
    sendFriendRequest,
    acceptFriendRequest,
    declineFriendRequest,
    removeFriend,
    cancelFriendRequest
  } = useFriendshipActions(currentUserId, targetUserId);

  // Don't show button for same user
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    return null;
  }

  const getButtonConfig = () => {
    switch (friendshipStatus) {
      case 'none':
        return {
          text: 'Add Friend',
          icon: UserPlus,
          onClick: sendFriendRequest,
          variant: 'default' as const,
          bgColor: 'bg-brand-salmon hover:bg-brand-dark-salmon'
        };
      
      case 'pending_sent':
        return {
          text: 'Request Sent',
          icon: Clock,
          onClick: cancelFriendRequest,
          variant: 'outline' as const,
          bgColor: 'border-brand-salmon text-brand-salmon hover:bg-brand-salmon hover:text-white'
        };
      
      case 'pending_received':
        return {
          text: 'Accept Request',
          icon: Check,
          onClick: acceptFriendRequest,
          variant: 'default' as const,
          bgColor: 'bg-green-600 hover:bg-green-700'
        };
      
      case 'accepted':
        return {
          text: 'Remove Friend',
          icon: UserMinus,
          onClick: removeFriend,
          variant: 'outline' as const,
          bgColor: 'border-red-500 text-red-500 hover:bg-red-500 hover:text-white'
        };
      
      default:
        return null;
    }
  };

  const buttonConfig = getButtonConfig();
  if (!buttonConfig) return null;

  const { text, icon: Icon, onClick, variant, bgColor } = buttonConfig;

  // Handle pending received case with accept/decline buttons
  if (friendshipStatus === 'pending_received') {
    return (
      <div className={`flex gap-2 ${className}`}>
        <Button
          onClick={acceptFriendRequest}
          disabled={loading}
          size={size}
          className={`flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold ${
            size === 'lg' 
              ? 'py-3 sm:py-4 px-4 sm:px-6 rounded-2xl h-12 sm:h-14' 
              : 'py-2 px-4 rounded-lg'
          }`}
        >
          <Check className={`mr-2 ${size === 'lg' ? 'h-4 sm:h-5 w-4 sm:w-5' : 'h-4 w-4'}`} />
          Accept
        </Button>
        <Button
          onClick={declineFriendRequest}
          disabled={loading}
          variant="outline"
          size={size}
          className={`border-gray-300 hover:border-red-500 hover:text-red-500 ${
            size === 'lg' 
              ? 'py-3 sm:py-4 px-3 rounded-2xl h-12 sm:h-14' 
              : 'py-2 px-3 rounded-lg'
          }`}
        >
          <X className={`${size === 'lg' ? 'h-4 sm:h-5 w-4 sm:w-5' : 'h-4 w-4'}`} />
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={onClick}
      disabled={loading}
      variant={variant}
      size={size}
      className={`w-full transition-all shadow-lg hover:shadow-xl ${bgColor} ${
        size === 'lg' 
          ? 'font-semibold py-3 sm:py-4 px-4 sm:px-6 rounded-2xl h-12 sm:h-14' 
          : 'font-medium py-2 px-4 rounded-lg'
      } ${className}`}
    >
      <Icon className={`mr-2 sm:mr-3 ${size === 'lg' ? 'h-4 sm:h-5 w-4 sm:w-5' : 'h-4 w-4'}`} />
      {text}
    </Button>
  );
};

export default FriendshipButton;