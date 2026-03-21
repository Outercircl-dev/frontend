import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, Users, Clock, Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useFriendRequests } from '@/hooks/useFriendRequests';
import { useFriends } from '@/hooks/useFriends';

interface User {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  bio?: string | null;
  friendship_status?: string;
  reliability_rating?: number;
}

const FriendFinder: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { sendFriendRequest, isLoading: requestLoading } = useFriendRequests();
  const { friends } = useFriends(currentUser?.id);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    getCurrentUser();
  }, []);

  // Search users with debouncing
  const { data: searchResults = [], isLoading, refetch } = useQuery({
    queryKey: ['find-users', searchTerm, currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id || !searchTerm.trim()) return [];
      
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
    enabled: !!currentUser?.id && !!searchTerm.trim()
  });

  const handleSendFriendRequest = async (userId: string) => {
    const success = await sendFriendRequest(userId);
    if (success) {
      refetch(); // Refresh search results to update status
    }
  };

  // Enhanced friend status validation
  const getFriendshipButton = (user: User) => {
    // Cross-reference with existing friends list for extra validation
    const isAlreadyFriend = friends.some(friend => friend.id === user.id);
    
    if (isAlreadyFriend || user.friendship_status === 'friends') {
      return (
        <Badge variant="secondary" className="text-xs bg-accent/20 text-accent-foreground">
          <Users className="w-3 h-3 mr-1" />
          Friends
        </Badge>
      );
    }
    
    switch (user.friendship_status) {
      case 'request_sent':
        return (
          <Badge variant="outline" className="text-xs border-primary/50 text-primary">
            <Clock className="w-3 h-3 mr-1" />
            Request Sent
          </Badge>
        );
      case 'request_received':
        return (
          <Badge variant="outline" className="text-xs border-secondary/50 text-secondary-foreground">
            <Clock className="w-3 h-3 mr-1" />
            Request Pending
          </Badge>
        );
      default:
        return (
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleSendFriendRequest(user.id)}
            disabled={requestLoading}
            className="hover:bg-primary hover:text-primary-foreground transition-all"
          >
            <UserPlus className="w-4 h-4 mr-1" />
            Add Friend
          </Button>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Find Friends
        </CardTitle>
        <CardDescription>
          Search for people to connect with on outercircl
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
          {!searchTerm.trim() ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-base font-medium mb-2">Start typing to search for people</p>
              <p>Connect with friends and discover new people to share activities with</p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Searching for amazing people...</p>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-base font-medium mb-2">No users found</p>
              <p>Try a different search term or browse suggested people</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {searchResults.map((user: any) => (
                <div
                  key={user.id}
                  className="group relative bg-card border border-border/50 rounded-xl p-6 hover:border-primary/30 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Profile Section */}
                  <div className="flex items-start gap-4 mb-4">
                    <div className="relative">
                      <Avatar className="w-16 h-16 border-2 border-border/20 group-hover:border-primary/30 transition-colors">
                        <AvatarImage src={user.avatar_url || ''} />
                        <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-primary/10 to-secondary/10">
                          {user.name?.[0] || user.username?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                      {user.reliability_rating && user.reliability_rating > 0 && (
                        <div className="absolute -bottom-1 -right-1 bg-background border border-border/50 rounded-full px-2 py-1 flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-500 fill-current" />
                          <span className="text-xs font-medium">{user.reliability_rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-base font-semibold text-foreground truncate">
                          {user.name || user.username}
                        </h3>
                        {(user.friendship_status === 'friends' || friends.some(f => f.id === user.id)) && (
                          <Badge variant="secondary" className="text-xs bg-accent/20 text-accent-foreground">
                            Friend
                          </Badge>
                        )}
                      </div>
                      {user.name && (
                        <p className="text-sm text-muted-foreground mb-1">@{user.username}</p>
                      )}
                      {user.bio && (
                        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
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
      </CardContent>
    </Card>
  );
};

export default FriendFinder;