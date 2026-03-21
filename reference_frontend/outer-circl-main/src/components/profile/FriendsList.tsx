import React from 'react';
import { Users, UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Friend } from '@/hooks/useFriends';
import { useNavigate } from 'react-router-dom';

interface FriendsListProps {
  friends: Friend[];
  loading: boolean;
  isCurrentUser: boolean;
}

const FriendsList: React.FC<FriendsListProps> = ({
  friends,
  loading,
  isCurrentUser
}) => {
  const navigate = useNavigate();

  const handleFriendClick = (friendId: string) => {
    navigate(`/profile/${friendId}`);
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E60023]"></div>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h4 className="text-lg font-medium text-gray-600 mb-2">
          {isCurrentUser ? 'No friends yet' : 'This user has no visible friends'}
        </h4>
        <p className="text-gray-500">
          {isCurrentUser 
            ? 'Start connecting with people by sending friend requests' 
            : 'Friends will appear here when they accept each other'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Users className="h-5 w-5" />
          Friends Network
        </h3>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {friends.length} friends
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {friends.map((friend) => (
          <div 
            key={friend.id} 
            className="flex items-center gap-4 p-4 hover:bg-gradient-to-r hover:from-pink-50 hover:to-purple-50 rounded-xl cursor-pointer group transition-all duration-200 border border-gray-200 hover:border-[#E60023] shadow-sm hover:shadow-md"
            onClick={() => handleFriendClick(friend.id)}
          >
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage src={friend.avatar_url || undefined} />
                <AvatarFallback className="bg-[#E60023] text-white">
                  {friend.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                friend.status === 'online' ? 'bg-green-500' : 'bg-gray-400'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-gray-900 truncate">
                  {friend.name}
                </h4>
              </div>
              <p className="text-xs text-gray-600 font-medium">@{friend.username}</p>
              {friend.mutualFriendsCount && friend.mutualFriendsCount > 0 && (
                <p className="text-xs text-gray-500">{friend.mutualFriendsCount} mutual friends</p>
              )}
              {friend.lastActivity && (
                <p className="text-xs text-gray-400">Last seen: {friend.lastActivity}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-gray-400 group-hover:text-[#E60023] transition-colors" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FriendsList;