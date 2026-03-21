import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, Users, Check, Clock, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

interface User {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  bio?: string | null;
  friendship_status?: string;
  reliability_rating?: number;
}

interface UserSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddUser: (user: User) => void;
  selectedUsers: User[];
  title?: string;
  description?: string;
}

const UserSearchModal: React.FC<UserSearchModalProps> = ({
  open,
  onOpenChange,
  onAddUser,
  selectedUsers,
  title = "Search Users",
  description = "Find and add users to your activity"
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getCurrentUser();
  }, []);

  // Search users
  const { data: searchResults = [], isLoading, refetch } = useQuery({
    queryKey: ['search-users', searchTerm, currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      
      const { data, error } = await supabase.rpc('search_users', {
        search_term: searchTerm,
        requesting_user_id: currentUser.id
      });

      if (error) {
        console.error('Error searching users:', error);
        return [];
      }

      return data || [];
    },
    enabled: open && !!currentUser?.id
  });

  const handleSendFriendRequest = async (userId: string) => {
    try {
      const { error } = await supabase.rpc('send_friend_request', {
        friend_id: userId
      });

      if (error) throw error;

      toast.success('Friend request sent!');
      refetch(); // Refresh the search results to update status
    } catch (error: any) {
      console.error('Error sending friend request:', error);
      toast.error(error.message || 'Failed to send friend request');
    }
  };

  const handleAddUser = (user: User) => {
    onAddUser(user);
    toast.success(`Added ${user.name || user.username} to the activity`);
  };

  const getFriendshipButton = (user: User) => {
    const isSelected = selectedUsers.some(u => u.id === user.id);
    
    if (isSelected) {
      return (
        <Button variant="secondary" size="sm" disabled>
          <Check className="w-4 h-4 mr-1" />
          Added
        </Button>
      );
    }

    switch (user.friendship_status) {
      case 'friends':
        return (
          <Button 
            variant="default" 
            size="sm"
            onClick={() => handleAddUser(user)}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <UserPlus className="w-4 h-4 mr-1" />
            Add to Activity
          </Button>
        );
      case 'request_sent':
        return (
          <Button variant="outline" size="sm" disabled>
            <Clock className="w-4 h-4 mr-1" />
            Request Sent
          </Button>
        );
      case 'request_received':
        return (
          <Button variant="outline" size="sm" disabled>
            <Clock className="w-4 h-4 mr-1" />
            Request Pending
          </Button>
        );
      default:
        return (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleSendFriendRequest(user.id)}
          >
            <UserPlus className="w-4 h-4 mr-1" />
            Add Friend
          </Button>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}. Add friends to invite them automatically to your activity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Search Results - Pinterest Style Grid */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p>Finding perfect people for your activity...</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-base font-medium mb-2">
                  {searchTerm ? 'No users found' : 'Start searching'}
                </p>
                <p>{searchTerm ? 'Try a different search term' : 'Type to find friends and new people'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.map((user: any) => (
                  <div
                    key={user.id}
                    className="group relative bg-card border border-border/50 rounded-xl p-4 hover:border-primary/30 hover:shadow-lg transition-all duration-300"
                  >
                    {/* Profile Section */}
                    <div className="flex items-start gap-3 mb-3">
                      <Avatar className="w-12 h-12 border border-border/20 group-hover:border-primary/30 transition-colors">
                        <AvatarImage src={user.avatar_url || ''} />
                        <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-primary/10 to-secondary/10">
                          {user.name?.[0] || user.username?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-foreground truncate">
                            {user.name || user.username}
                          </h3>
                          {user.friendship_status === 'friends' && (
                            <Badge variant="secondary" className="text-xs bg-accent/20 text-accent-foreground">
                              Friend
                            </Badge>
                          )}
                          {user.reliability_rating && user.reliability_rating > 0 && (
                            <div className="flex items-center gap-1 ml-auto">
                              <span className="text-xs text-muted-foreground">
                                {user.reliability_rating.toFixed(1)}
                              </span>
                              <span className="text-yellow-500 text-xs">★</span>
                            </div>
                          )}
                        </div>
                        {user.name && (
                          <p className="text-xs text-muted-foreground mb-1">@{user.username}</p>
                        )}
                        {user.bio && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {user.bio}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Action Button */}
                    <div className="flex justify-end">
                      {getFriendshipButton(user)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Selected Users Summary */}
          {selectedUsers.length > 0 && (
            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-foreground mb-2">
                Selected Users ({selectedUsers.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <Badge key={user.id} variant="secondary" className="flex items-center gap-2">
                    <Avatar className="w-4 h-4">
                      <AvatarImage src={user.avatar_url || ''} />
                      <AvatarFallback className="text-xs">
                        {user.name?.[0] || user.username?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{user.name || user.username}</span>
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserSearchModal;