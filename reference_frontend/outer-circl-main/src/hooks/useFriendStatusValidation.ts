import { useFriends } from './useFriends';

export interface User {
  id: string;
  friendship_status?: string;
}

/**
 * Hook to validate and cross-reference friend status between database and local state
 * Provides enhanced validation to prevent showing incorrect "Add Friend" buttons
 */
export const useFriendStatusValidation = (currentUserId?: string) => {
  const { friends } = useFriends(currentUserId);

  const isUserAlreadyFriend = (userId: string): boolean => {
    return friends.some(friend => friend.id === userId);
  };

  const getValidatedFriendshipStatus = (user: User): string => {
    // Cross-reference with local friends list for extra validation
    if (isUserAlreadyFriend(user.id)) {
      return 'friends';
    }
    
    // Return the database status if not found in local list
    return user.friendship_status || 'none';
  };

  const shouldShowAddFriendButton = (user: User): boolean => {
    const validatedStatus = getValidatedFriendshipStatus(user);
    return validatedStatus === 'none';
  };

  const shouldShowFriendsLabel = (user: User): boolean => {
    const validatedStatus = getValidatedFriendshipStatus(user);
    return validatedStatus === 'friends';
  };

  return {
    friends,
    isUserAlreadyFriend,
    getValidatedFriendshipStatus,
    shouldShowAddFriendButton,
    shouldShowFriendsLabel,
  };
};