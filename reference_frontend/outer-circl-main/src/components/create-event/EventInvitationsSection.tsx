import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, X, Search, Crown, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import UserSearchModal from './UserSearchModal';

interface Friend {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  bio?: string | null;
  friendship_status?: string;
  reliability_rating?: number;
}

interface EventInvitationsSectionProps {
  selectedFriends: Friend[];
  onFriendsChange: (friends: Friend[]) => void;
  userMembershipTier: string;
}

const EventInvitationsSection: React.FC<EventInvitationsSectionProps> = ({
  selectedFriends,
  onFriendsChange,
  userMembershipTier
}) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showUserSearch, setShowUserSearch] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<any>(null);

  // Check if user is premium
  const isPremium = userMembershipTier === 'premium';

  // Get current user
  React.useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getCurrentUser();
  }, []);

  // Fetch user's friends
  const { data: friends = [], isLoading: friendsLoading } = useQuery({
    queryKey: ['user-friends', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];

      const { data, error } = await supabase.rpc('get_user_friends', {
        p_user_id: currentUser.id
      });

      if (error) {
        console.error('Error fetching friends:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!currentUser?.id
  });

  // Filter friends based on search term
  const filteredFriends = React.useMemo(() => {
    if (!searchTerm) return friends;
    return friends.filter((friend: Friend) =>
      friend.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      friend.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [friends, searchTerm]);

  const handleAddUser = (user: Friend) => {
    if (selectedFriends.find(f => f.id === user.id)) {
      toast.error('User already added');
      return;
    }
    onFriendsChange([...selectedFriends, user]);
    toast.success(`Added ${user.name || user.username} to the activity`);
  };

  const handleAddFriend = (friend: Friend) => {
    handleAddUser(friend);
  };

  const handleRemoveFriend = (friendId: string) => {
    const removedFriend = selectedFriends.find(f => f.id === friendId);
    onFriendsChange(selectedFriends.filter(f => f.id !== friendId));
    if (removedFriend) {
      toast.success(`Removed ${removedFriend.name || removedFriend.username} from the activity`);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invite People
            {isPremium && <Badge variant="secondary" className="text-xs">Premium</Badge>}
          </CardTitle>
          <CardDescription>
            Add friends and search for users to invite to your activity. {!isPremium && 'Premium users get additional features.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Selected Friends */}
          {selectedFriends.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-foreground">Selected People</h4>
              <div className="flex flex-wrap gap-2">
                {selectedFriends.map((friend) => (
                  <Badge key={friend.id} variant="secondary" className="flex items-center gap-2 px-3 py-1">
                    <Avatar className="w-4 h-4">
                      <AvatarImage src={friend.avatar_url || ''} />
                      <AvatarFallback className="text-xs">
                        {friend.name?.[0] || friend.username?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{friend.name || friend.username}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={() => handleRemoveFriend(friend.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUserSearch(true)}
              className="flex-1"
            >
              <Users className="w-4 h-4 mr-2" />
              Search All Users
            </Button>
          </div>

          {/* Friends Section */}
          {friends.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground">Your Friends</h4>
                <span className="text-xs text-muted-foreground">{friends.length} friends</span>
              </div>
              
              {/* Search Friends */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search friends..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Friends List */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {friendsLoading ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Loading friends...
                  </div>
                ) : filteredFriends.length === 0 ? (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    {searchTerm ? 'No friends found matching your search' : 'No friends to invite'}
                  </div>
                ) : (
                  filteredFriends.map((friend: Friend) => {
                    const isSelected = selectedFriends.some(f => f.id === friend.id);
                    return (
                      <div
                        key={friend.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-border transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={friend.avatar_url || ''} />
                            <AvatarFallback>
                              {friend.name?.[0] || friend.username?.[0] || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {friend.name || friend.username}
                            </p>
                            {friend.name && (
                              <p className="text-xs text-muted-foreground">@{friend.username}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={isSelected ? "secondary" : "default"}
                          onClick={() => isSelected ? handleRemoveFriend(friend.id) : handleAddFriend(friend)}
                        >
                          {isSelected ? (
                            <>
                              <X className="w-4 h-4 mr-1" />
                              Remove
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-4 h-4 mr-1" />
                              Add
                            </>
                          )}
                        </Button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Premium Features */}
          {isPremium && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 text-sm text-primary">
                <Crown className="h-4 w-4" />
                <span className="font-medium">Premium Features Active</span>
              </div>
              <p className="text-xs text-primary/70 mt-1">
                Enhanced user search • Priority invitations • Advanced friend management
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Search Modal */}
      <UserSearchModal
        open={showUserSearch}
        onOpenChange={setShowUserSearch}
        onAddUser={handleAddUser}
        selectedUsers={selectedFriends}
        title="Find Users"
        description="Search for users to add to your activity"
      />
    </>
  );
};

export default EventInvitationsSection;