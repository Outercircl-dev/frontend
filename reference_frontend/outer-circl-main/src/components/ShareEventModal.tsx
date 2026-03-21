import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Copy, MessageCircle, Mail, MessageSquare, Send, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ShareEventModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: any;
  currentUser: any;
}

interface User {
  id: string;
  name: string;
  avatar_url?: string;
  username?: string;
}

const ShareEventModal: React.FC<ShareEventModalProps> = ({
  open,
  onOpenChange,
  event,
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'link' | 'message'>('link');
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);

  const eventUrl = `${window.location.origin}/event/${event?.id}`;
  const defaultMessage = `🎯 Join "${event?.title}" 
  
📅 ${event?.date ? format(new Date(event.date), 'EEEE, MMMM d, yyyy') : 'Date TBD'}
📍 ${event?.location || 'Location TBD'}
👥 ${event?.attendees || 0}/${event?.maxAttendees || '∞'} attending

${eventUrl}

Join our community and discover amazing activities near you! 🌟`;

  // Fetch users for messaging
  useEffect(() => {
    if (open && activeTab === 'message' && currentUser) {
      console.log('Fetching users...', { open, activeTab, currentUser: currentUser?.id });
      fetchUsers();
    }
  }, [open, activeTab, currentUser]);

  // Filter users based on search
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = users.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    } else {
      setFilteredUsers(users);
    }
  }, [users, searchQuery]);

  const fetchUsers = async () => {
    if (!currentUser) {
      console.log('No current user found');
      return;
    }
    
    console.log('Starting fetchUsers with currentUser:', currentUser.id);
    setUsersLoading(true);
    try {
      // Search for users (excluding current user)
      console.log('Calling search_users RPC function...');
      const { data, error } = await supabase
        .rpc('search_users', {
          search_term: '',
          requesting_user_id: currentUser.id
        });

      console.log('RPC response:', { data, error });

      if (error) throw error;

      console.log('Setting users:', data || []);
      setUsers(data || []);
      setFilteredUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl);
      toast.success("Activity link copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy link. Please try again.");
    }
  };

  const handleNativeShare = async () => {
    const shareData = {
      title: event?.title || 'Activity',
      text: `Join me for ${event?.title}!`,
      url: eventUrl,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast.success("Shared successfully!");
      } else {
        // Fallback to copy
        await handleCopyLink();
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error);
        toast.error("Failed to share. Link copied instead.");
        await handleCopyLink();
      }
    }
  };

  const handleExternalShare = (platform: string) => {
    const eventTitle = event?.title || 'Activity';
    let shareUrl = "";
    
    switch(platform) {
      case "email":
        shareUrl = `mailto:?subject=${encodeURIComponent(`Join me for ${eventTitle}`)}&body=${encodeURIComponent(defaultMessage)}`;
        break;
      case "whatsapp":
        shareUrl = `https://wa.me/?text=${encodeURIComponent(`Join me for ${eventTitle}! ${eventUrl}`)}`;
        break;
      case "sms":
        shareUrl = `sms:?body=${encodeURIComponent(`Join me for ${eventTitle}! ${eventUrl}`)}`;
        break;
    }
    
    if (shareUrl) {
      try {
        window.location.href = shareUrl;
      } catch (error) {
        toast.error("Failed to open sharing app");
      }
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSendMessages = async () => {
    if (selectedUsers.length === 0) {
      toast.error('Please select at least one user to share with');
      return;
    }

    if (!currentUser) {
      toast.error('You must be logged in to send messages');
      return;
    }

    setLoading(true);
    try {
      const messageContent = customMessage.trim() || defaultMessage;
      
      // Send message to each selected user
      for (const userId of selectedUsers) {
        const { error } = await supabase
          .from('messages')
          .insert({
            sender_id: currentUser.id,
            recipient_id: userId,
            content: messageContent,
            message_type: 'direct'
          });

        if (error) throw error;
      }

      toast.success(`Activity shared with ${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''}!`);
      onOpenChange(false);
      
      // Reset form
      setSelectedUsers([]);
      setCustomMessage('');
      setSearchQuery('');
    } catch (error) {
      console.error('Error sending messages:', error);
      toast.error('Failed to share activity. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Event</DialogTitle>
        </DialogHeader>

        {/* Tab Navigation */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'link'
                ? 'border-[#E60023] text-[#E60023]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Copy Link
          </button>
          <button
            onClick={() => setActiveTab('message')}
            className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'message'
                ? 'border-[#E60023] text-[#E60023]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Message Users
          </button>
        </div>

        {/* Tab Content */}
        <div className="mt-4">
          {activeTab === 'link' ? (
            <div className="space-y-4">
              {/* Copy Link Section */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Event Link
                </label>
                <div className="flex gap-2">
                  <Input 
                    value={eventUrl} 
                    readOnly 
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleCopyLink}
                    variant="outline"
                    size="icon"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Native Share & External Share Options */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Share via
                </label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <Button
                    onClick={handleNativeShare}
                    className="flex items-center justify-center gap-2"
                  >
                    <Send className="h-4 w-4" />
                    Share
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCopyLink}
                    className="flex items-center justify-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Copy Link
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => handleExternalShare('email')}
                    className="flex flex-col items-center p-3 h-auto"
                  >
                    <Mail className="h-5 w-5 mb-1" />
                    <span className="text-xs">Email</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleExternalShare('whatsapp')}
                    className="flex flex-col items-center p-3 h-auto"
                  >
                    <MessageCircle className="h-5 w-5 mb-1" />
                    <span className="text-xs">WhatsApp</span>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleExternalShare('sms')}
                    className="flex flex-col items-center p-3 h-auto"
                  >
                    <MessageSquare className="h-5 w-5 mb-1" />
                    <span className="text-xs">SMS</span>
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search Users */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* User List */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Select users to share with
                </label>
                <ScrollArea className="h-48 border rounded-md p-2">
                  {usersLoading ? (
                    <div className="text-center py-8 text-gray-500">
                      Loading users...
                    </div>
                  ) : filteredUsers.length > 0 ? (
                    <div className="space-y-1">
                      {filteredUsers.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => toggleUserSelection(user.id)}
                          className={`flex items-center p-2 rounded cursor-pointer transition-colors ${
                            selectedUsers.includes(user.id)
                              ? 'bg-[#E60023]/10 border border-[#E60023]/20'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <Avatar className="h-8 w-8 mr-3">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{user.name}</p>
                            {user.username && (
                              <p className="text-xs text-gray-500">@{user.username}</p>
                            )}
                          </div>
                          {selectedUsers.includes(user.id) && (
                            <div className="w-4 h-4 bg-[#E60023] rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      {searchQuery ? 'No users found' : 'No users available'}
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Custom Message */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Custom message (optional)
                </label>
                <Textarea
                  placeholder={defaultMessage}
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {customMessage.length}/500 characters
                </p>
              </div>

              {/* Send Button */}
              <Button
                onClick={handleSendMessages}
                disabled={selectedUsers.length === 0 || loading}
                className="w-full bg-[#E60023] hover:bg-[#D50C22]"
              >
                {loading ? (
                  'Sending...'
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send to {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareEventModal;