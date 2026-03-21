import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MessageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  onStartConversation: (userId: string) => void;
}

interface SearchResult {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  friendship_status: string | null;
}

const MessageSearchModalContent: React.FC<MessageSearchModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  onStartConversation,
}) => {

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [startingConversations, setStartingConversations] = useState<Set<string>>(new Set());

  const searchUsers = async (term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('search_users', {
        search_term: term,
        requesting_user_id: currentUserId
      });

      if (error) {
        console.error('Search error:', error);
        toast.error('Failed to search users');
        return;
      }

      setSearchResults(data || []);
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search users');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartConversation = async (userId: string) => {
    setStartingConversations(prev => new Set(prev).add(userId));
    
    try {
      // Check if user can message this person
      const { data: canMessage, error: permissionError } = await supabase.rpc('can_message_user', {
        sender_id: currentUserId,
        recipient_id: userId
      });

      if (permissionError) {
        console.error('Permission check error:', permissionError);
        toast.error('Unable to check messaging permissions');
        return;
      }

      if (!canMessage) {
        toast.error('You cannot message this user. You need to be friends to send messages.');
        return;
      }

      onStartConversation(userId);
      onClose();
      toast.success('Starting conversation...');
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast.error('Failed to start conversation');
    } finally {
      setStartingConversations(prev => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) {
        searchUsers(searchTerm);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset search when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSearchResults([]);
      setStartingConversations(new Set());
    }
  }, [isOpen]);

  const getFriendshipBadgeColor = (status: string | null) => {
    switch (status) {
      case 'friends':
      case 'accepted':  // Database stores accepted friendships as 'accepted'
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'requested':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  const getFriendshipBadgeText = (status: string | null) => {
    switch (status) {
      case 'friends':
      case 'accepted':  // Database stores accepted friendships as 'accepted'
        return 'Friends';
      case 'pending':
        return 'Request Sent';
      case 'requested':
        return 'Friend Request';
      default:
        return 'Not Friends';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Search Users</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by name or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              autoFocus
            />
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((user) => (
                <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>
                        {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
                      {user.bio && (
                        <p className="text-xs text-muted-foreground truncate mt-1">{user.bio}</p>
                      )}
                      <Badge className={`text-xs mt-1 ${getFriendshipBadgeColor(user.friendship_status)}`}>
                        {getFriendshipBadgeText(user.friendship_status)}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleStartConversation(user.id)}
                    disabled={startingConversations.has(user.id)}
                    size="sm"
                    className="bg-[#E60023] hover:bg-[#D50C22] text-white"
                  >
                    {startingConversations.has(user.id) ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        Starting...
                      </>
                    ) : (
                      'Message'
                    )}
                  </Button>
                </div>
              ))
            ) : searchTerm && !isLoading ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No users found matching "{searchTerm}"</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">Start typing to search for users</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Main component wrapped with React safety
const MessageSearchModal: React.FC<MessageSearchModalProps> = (props) => {
  return (
    <MessageSearchModalContent {...props} />
  );
};

export default MessageSearchModal;