import React, { useState, useEffect, useMemo } from 'react';
import { useSafeMessaging as useMessaging } from '@/contexts/SafeMessagingContext';
import { ThreadedMessageList } from './ThreadedMessageList';
import { ConversationHeader } from './ConversationHeader';
import { MessageComposer } from './MessageComposer';
import { ConversationList } from '../messaging/ConversationList';
import { Button } from '@/components/ui/button';
import { MessageSquare, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PinterestMessagingViewProps {
  messageFilter?: 'all' | 'direct' | 'activities';
  currentUser?: any;
  selectedConversation?: string | null;
  onConversationChange?: (conversationId: string | null) => void;
}

/**
 * Phase 7: Pinterest-style messaging interface
 * Features: Virtualized lists, threaded messages, smooth animations
 */
export const PinterestMessagingView: React.FC<PinterestMessagingViewProps> = ({ 
  messageFilter = 'all', 
  currentUser: propCurrentUser, 
  selectedConversation, 
  onConversationChange 
}) => {
  const [selectedChat, setSelectedChat] = useState<string | null>(selectedConversation);
  const [authedUser, setAuthedUser] = useState<any>(propCurrentUser || null);

  // Ensure we have an authenticated user
  useEffect(() => {
    const init = async () => {
      if (!propCurrentUser) {
        const { data } = await supabase.auth.getUser();
        if (data?.user) setAuthedUser(data.user);
      } else {
        setAuthedUser(propCurrentUser);
      }
    };
    init();
  }, [propCurrentUser]);

  const currentUser = propCurrentUser || authedUser;

  // Use unified messaging system
  const { 
    messages: unifiedMessages, 
    loading,
    fetchData,
    sendMessage,
    markAsRead
  } = useMessaging();

  // Filter messages based on current filter and conversation
  const filteredMessages = useMemo(() => {
    if (!unifiedMessages || !Array.isArray(unifiedMessages)) return [];
    
    let filtered = [...unifiedMessages];

    // Filter by message type
    if (messageFilter === 'direct') {
      filtered = filtered.filter(msg => !msg.event_id);
    } else if (messageFilter === 'activities') {
      filtered = filtered.filter(msg => !!msg.event_id);
    }

    // Filter by selected conversation
    if (selectedChat) {
      if (selectedChat.startsWith('event_')) {
        const eventId = selectedChat.replace('event_', '');
        filtered = filtered.filter(msg => msg.event_id === eventId);
      } else {
        filtered = filtered.filter(msg => 
          !msg.event_id && 
          (msg.sender_id === selectedChat || msg.recipient_id === selectedChat)
        );
      }
    }

    return filtered;
  }, [unifiedMessages, messageFilter, selectedChat]);

  // Get conversation metadata for header
  const conversationMeta = useMemo(() => {
    if (!selectedChat || filteredMessages.length === 0) return null;

    const firstMsg = filteredMessages[0];
    
    if (selectedChat.startsWith('event_')) {
      return {
        name: firstMsg.event?.title || 'Activity Chat',
        avatar: undefined,
        isOnline: false,
        unreadCount: filteredMessages.filter(m => !m.read_at && m.sender_id !== currentUser?.id).length
      };
    } else {
      // Direct message - show the other person
      const otherPerson = firstMsg.sender_id === currentUser?.id 
        ? null // Would need to fetch recipient data
        : firstMsg.sender;
      
      return {
        name: otherPerson?.name || 'User',
        avatar: otherPerson?.avatar_url,
        isOnline: false, // TODO: Add presence tracking
        unreadCount: filteredMessages.filter(m => !m.read_at && m.sender_id !== currentUser?.id).length
      };
    }
  }, [selectedChat, filteredMessages, currentUser]);

  // Fetch data when component mounts
  useEffect(() => {
    if (currentUser) {
      fetchData('both', { useCache: false });
    }
  }, [fetchData, currentUser, messageFilter]);

  // Handle selected conversation changes
  useEffect(() => {
    if (selectedConversation !== null) {
      setSelectedChat(selectedConversation);
    }
  }, [selectedConversation]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !currentUser?.id || !selectedChat) return;
    
    try {
      if (selectedChat.startsWith('event_')) {
        const eventId = selectedChat.replace('event_', '');
        await sendMessage(content, { 
          eventId,
          type: 'event' 
        });
      } else {
        await sendMessage(content, { 
          recipientId: selectedChat,
          type: 'direct' 
        });
      }
      
      // Force refresh to ensure consistency
      await fetchData('messages', { useCache: false });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
      throw error;
    }
  };

  const handleConversationSelect = (conversationId: string) => {
    setSelectedChat(conversationId);
    onConversationChange?.(conversationId);
    
    // Mark all messages in this conversation as read
    const conversationMessages = unifiedMessages.filter(msg => {
      if (conversationId.startsWith('event_')) {
        const eventId = conversationId.replace('event_', '');
        return msg.event_id === eventId;
      } else {
        return msg.sender_id === conversationId || msg.recipient_id === conversationId;
      }
    });
    
    const unreadIds = conversationMessages
      .filter(m => !m.read_at && m.sender_id !== currentUser?.id)
      .map(m => m.id);
    
    if (unreadIds.length > 0) {
      markAsRead(unreadIds, 'messages');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background">
      {/* Conversations Sidebar - Pinterest-style */}
      <div className={`
        ${selectedChat ? 'hidden lg:flex' : 'flex'} 
        flex-col w-full lg:w-80 border-r border-border bg-card/30 backdrop-blur-sm
      `}>
        <div className="p-4 border-b border-border bg-card/50">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Conversations</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {unifiedMessages.length} message{unifiedMessages.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <ConversationList
          messages={unifiedMessages}
          selectedConversation={selectedChat}
          onConversationSelect={handleConversationSelect}
          onMarkAsRead={async (messageIds: string[]) => {
            try {
              await markAsRead(messageIds, 'messages');
            } catch (error) {
              console.error('Error marking as read:', error);
            }
          }}
          className="flex-1 overflow-y-auto"
          currentUserId={authedUser?.id}
          messageFilter={messageFilter}
        />
      </div>

      {/* Chat Area - Pinterest-style */}
      <div className={`
        ${selectedChat ? 'flex' : 'hidden lg:flex'} 
        flex-col flex-1 min-w-0 bg-background
      `}>
        {selectedChat && conversationMeta ? (
          <>
            {/* Pinterest-style Header */}
            <ConversationHeader
              name={conversationMeta.name}
              avatar={conversationMeta.avatar}
              isOnline={conversationMeta.isOnline}
              unreadCount={conversationMeta.unreadCount}
              onArchive={() => {
                // TODO: Implement archive
                toast.info('Archive feature coming soon');
              }}
            />

            {/* Virtualized Message List */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <ThreadedMessageList
                messages={filteredMessages}
                currentUserId={currentUser?.id}
                onLoadMore={async () => {
                  // Load more messages if needed
                  await fetchData('messages', { useCache: false });
                }}
                hasMore={false}
              />
            </div>

            {/* Pinterest-style Message Composer */}
            <MessageComposer
              onSend={handleSendMessage}
              placeholder={`Message ${conversationMeta.name}...`}
            />
          </>
        ) : (
          // Empty state
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md px-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-6 mx-auto">
                <MessageSquare className="h-10 w-10 text-primary/40" />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                Your messages live here
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                Select a conversation to start chatting with activity participants or send direct messages to friends
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedChat(null)}
                className="mt-6 lg:hidden"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to conversations
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
