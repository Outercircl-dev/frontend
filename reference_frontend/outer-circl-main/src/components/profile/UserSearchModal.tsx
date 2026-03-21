import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, UserPlus, UserCheck, Clock, X, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface UserSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

interface SearchResult {
  id: string;
  name: string;
  username: string;
  avatar_url: string;
  bio: string;
  friendship_status: string;
}

export const UserSearchModal = ({ isOpen, onClose, currentUserId }: UserSearchModalProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [sendingRequests, setSendingRequests] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const searchUsers = async (term: string) => {
    if (!term.trim() || term.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const { data, error } = await supabase.rpc("search_users", {
        search_term: term,
        requesting_user_id: currentUserId,
      });

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error("Error searching users:", error);
      toast({
        title: "Error",
        description: "Failed to search users. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (friendId: string) => {
    setSendingRequests(prev => new Set(prev).add(friendId));
    
    try {
      const { error } = await supabase.from("friendships").insert({
        user_id: currentUserId,
        friend_id: friendId,
        requested_by: currentUserId,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Friend Request Sent",
        description: "Your friend request has been sent successfully.",
      });

      // Update the search results to reflect the new status
      setSearchResults(prev => 
        prev.map(user => 
          user.id === friendId 
            ? { ...user, friendship_status: "pending" }
            : user
        )
      );
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast({
        title: "Error",
        description: "Failed to send friend request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(friendId);
        return newSet;
      });
    }
  };

  const getFriendshipStatusBadge = (status: string) => {
    switch (status) {
      case "accepted":
      case "friends":
        return <Badge variant="secondary" className="bg-accent/20 text-accent-foreground"><UserCheck className="h-3 w-3 mr-1" />Friends</Badge>;
      case "pending":
      case "request_sent":
        return <Badge variant="outline" className="border-primary/50 text-primary"><Clock className="h-3 w-3 mr-1" />Request Sent</Badge>;
      case "request_received":
        return <Badge variant="outline" className="border-secondary/50 text-secondary-foreground"><Clock className="h-3 w-3 mr-1" />Request Pending</Badge>;
      case "rejected":
        return <Badge variant="outline" className="border-destructive/50 text-destructive"><X className="h-3 w-3 mr-1" />Declined</Badge>;
      default:
        return null;
    }
  };

  const canSendFriendRequest = (status: string) => {
    return status === "none" || !status;
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchTerm);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, currentUserId]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Find Friends
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by name or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {isSearching && (
              <div className="text-center py-12 text-sm text-muted-foreground">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p>Searching for amazing people...</p>
              </div>
            )}

            {!isSearching && searchTerm.length >= 2 && searchResults.length === 0 && (
              <div className="text-center py-12 text-sm text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-base font-medium mb-2">No users found</p>
                <p>No one found matching "{searchTerm}"</p>
              </div>
            )}

            {!isSearching && searchTerm.length < 2 && (
              <div className="text-center py-12 text-sm text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-base font-medium mb-2">Find Friends</p>
                <p>Enter at least 2 characters to search for users</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              {searchResults.map((user) => (
                <div key={user.id} className="group relative bg-card border border-border/50 rounded-xl p-4 hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-12 h-12 border border-border/20 group-hover:border-primary/30 transition-colors">
                      <AvatarImage src={user.avatar_url} />
                      <AvatarFallback className="text-sm font-semibold bg-gradient-to-br from-primary/10 to-secondary/10">
                        {user.name?.charAt(0) || user.username?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-foreground truncate">{user.name || "No name"}</h4>
                        {user.username && (
                          <span className="text-xs text-muted-foreground">@{user.username}</span>
                        )}
                      </div>
                      {user.bio && (
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">{user.bio}</p>
                      )}
                      <div className="flex items-center justify-between">
                        {getFriendshipStatusBadge(user.friendship_status)}
                        {canSendFriendRequest(user.friendship_status) && (
                          <Button
                            size="sm"
                            onClick={() => sendFriendRequest(user.id)}
                            disabled={sendingRequests.has(user.id)}
                            className="ml-auto"
                          >
                            {sendingRequests.has(user.id) ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <>
                                <UserPlus className="h-4 w-4 mr-1" />
                                Add Friend
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};